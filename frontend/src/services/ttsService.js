import { marked } from "marked";

// ─────────────────────────────────────────────────────────────
// LumiVoice · Text-To-Speech Service
//
// All voice logic lives here. The UI (voiceAssistantBar.js) ONLY calls
// these exported functions: it never touches speechSynthesis directly.
// This mirrors the service pattern used across the project
// (courseService.js, contentService.js).
//
//   Frontend (voiceAssistantBar) → ttsService → SpeechSynthesis (browser)
//                                            └→ agent/ (summarize only)
//
// TTS runs 100% in the browser with the native SpeechSynthesis API:
// no backend, no API key, no cost. Only `summarizeText` calls the agent.
// ─────────────────────────────────────────────────────────────

// ─── Why chunked playback ───────────────────────────────────────
// speechSynthesis.pause()/resume() are unreliable in Chromium-based
// browsers (Edge, Chrome), especially with "Online (Natural)" voices:
// pause() is sometimes a silent no-op (speech keeps going) and resume()
// can report "playing" while producing no audio at all. This is a
// long-standing browser bug, not something we can detect-and-patch
// reliably from JS.
//
// The fix is to stop depending on pause()/resume() entirely and only use
// speak() and cancel(), which ARE reliable everywhere. We split the text
// into sentence-sized chunks and speak them one at a time:
//   - "pause"  = cancel() the chunk currently playing, remember its index
//   - "resume"/"play" = speak() that same chunk again
// The tradeoff is that resuming replays the current sentence from its
// start rather than the exact word — a small price for pause that
// actually works on every browser.

let utterance = null;
let currentRate = 1;
let isSpeaking = false; // a chunk is actively being spoken right now
let isPaused = false;   // we are deliberately paused between chunks

// Full text being read, split into sentence-sized pieces, and which one
// we are currently on / about to resume from.
let currentText = "";
let chunks = [];
let chunkIndex = 0;

/**
 * Splits text into small speakable pieces so we can play/pause between
 * them. First breaks on sentence punctuation, then further on commas/
 * semicolons, then finally on word boundaries — whatever it takes to keep
 * every piece under MAX_CHUNK_CHARS.
 *
 * Why so small (not just one chunk per sentence): when a voice doesn't
 * report onboundary (common with Edge's "Online/Natural" voices), pausing
 * skips whatever is left of the CURRENT chunk rather than repeating it
 * (see pauseSpeech). Smaller chunks mean that skip is at most a phrase,
 * not a whole sentence, so it's basically inaudible instead of feeling
 * like missing content.
 *
 * Chunks are also capped for a second, unrelated reason: Chromium-based
 * browsers (Edge/Chrome) have a long-standing bug where a single
 * utterance that runs past ~15 seconds of audio can go silent without
 * ever firing `onend`/`onerror`. Keeping chunks short keeps every
 * utterance well under that window, even at 0.75× speed.
 */
const MAX_CHUNK_CHARS = 70;

function splitByLength(str, maxLen) {
  if (str.length <= maxLen) return [str];
  const words = str.split(/\s+/);
  const pieces = [];
  let buf = "";
  for (const word of words) {
    const next = buf ? `${buf} ${word}` : word;
    if (next.length > maxLen && buf) {
      pieces.push(buf);
      buf = word;
    } else {
      buf = next;
    }
  }
  if (buf) pieces.push(buf);
  return pieces;
}

function splitIntoChunks(text) {
  const sentences = (text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [text])
    .map((s) => s.trim())
    .filter(Boolean);

  const pieces = [];
  for (const sentence of sentences) {
    if (sentence.length <= MAX_CHUNK_CHARS) {
      pieces.push(sentence);
      continue;
    }
    // Long sentence: break at commas/semicolons/colons first, then fall
    // back to raw word-wrapping for any clause still too long.
    const clauses = sentence.match(/[^,;:]+[,;:]*\s*/g) || [sentence];
    for (const clause of clauses) {
      const trimmed = clause.trim();
      if (!trimmed) continue;
      pieces.push(...splitByLength(trimmed, MAX_CHUNK_CHARS));
    }
  }

  return pieces.length ? pieces : [text.trim()];
}

// Callbacks the UI can register to update its buttons (play/pause) without
// having to poll the state.
let onStateChange = null;

// Cached English voice. The browser loads voices asynchronously, so we pick
// one lazily and remember it. Without this, speechSynthesis uses the system
// default voice (which on a Spanish-configured Mac is a Spanish voice trying
// to pronounce English words, hence the odd accent).
let englishVoice = null;

function pickEnglishVoice() {
  const voices = speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;

  // Prefer a natural US English voice, then any en-US, then any English.
  return (
    voices.find((v) => /en[-_]US/i.test(v.lang) && /google|samantha|natural/i.test(v.name)) ||
    voices.find((v) => /en[-_]US/i.test(v.lang)) ||
    voices.find((v) => /^en\b|en[-_]/i.test(v.lang)) ||
    null
  );
}

function getEnglishVoice() {
  if (englishVoice) return englishVoice;
  englishVoice = pickEnglishVoice();
  return englishVoice;
}

// Voices may not be ready at load time; refresh the cache when they arrive.
if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.onvoiceschanged = () => { englishVoice = pickEnglishVoice(); };
}

function emitState(state) {
  // state: "playing" | "paused" | "stopped"
  if (typeof onStateChange === "function") onStateChange(state);
}

/**
 * Lets the UI listen to player state changes.
 * @param {(state: "playing"|"paused"|"stopped") => void} cb
 */
export function setOnStateChange(cb) {
  onStateChange = cb;
}

// ─── Basic playback ──────────────────────────────────────────

// Chaining cancel() immediately followed by speak() — which is exactly
// what pause→play and speed changes do — can desync Chromium's internal
// speech queue if repeated enough times in a session (a known Chrome/Edge
// issue). A short delay between the two lets the engine actually flush
// the cancellation before we ask it to speak again.
const RESTART_DELAY_MS = 80;

// If an utterance never reports onstart within this window, the engine
// has likely gone silently stuck (the Chromium "goes mute" bug). We
// recover by cancelling and retrying a couple of times before finally
// giving up on that piece, instead of hanging forever with a UI that
// looks paused/broken.
const START_WATCHDOG_MS = 3000;
const MAX_START_RETRIES = 2;
let startWatchdogTimer = null;

function clearStartWatchdog() {
  if (startWatchdogTimer) {
    clearTimeout(startWatchdogTimer);
    startWatchdogTimer = null;
  }
}

// How far into the CURRENT chunk we've actually gotten, in characters.
// Updated live via onboundary while speaking, and used by pauseSpeech to
// know exactly where to resume — so Play continues instead of repeating
// the whole sentence. Reset to 0 whenever a chunk starts fresh.
let chunkResumeOffset = 0;

// Whether onboundary has fired at least once for the utterance currently
// playing. Some voices (notably Edge's "Online/Natural" ones) never fire
// it at all, in which case we have no word-level position to resume from.
let currentChunkBoundaryFired = false;

// Where resumeSpeech() should continue from, decided by pauseSpeech():
// either the exact spot in the current chunk (boundary info available) or
// the start of the next chunk (no boundary info — skip rather than repeat).
let pausedTargetIndex = 0;
let pausedTargetOffset = 0;

/**
 * Speaks a single chunk by index. Recursively moves on to the next chunk
 * on natural completion, unless we've been paused/stopped in the meantime.
 * @param {number} index
 * @param {object} [opts]
 * @param {number} [opts.retryCount=0]       internal: how many restart
 *                                           attempts we've made on this chunk
 * @param {number} [opts.resumeOffset=0]     char offset into chunks[index]
 *                                           to resume from (skips the part
 *                                           already spoken before pausing)
 */
function playChunk(index, { retryCount = 0, resumeOffset = 0 } = {}) {
  clearStartWatchdog();

  if (index < 0 || index >= chunks.length) {
    // Reached the end of the text.
    isSpeaking = false;
    isPaused = false;
    chunkIndex = 0;
    chunkResumeOffset = 0;
    emitState("stopped");
    return;
  }

  const fullChunk = chunks[index];
  const textToSpeak = resumeOffset > 0 ? fullChunk.slice(resumeOffset).trim() : fullChunk;

  // Nothing meaningful left in this chunk (we paused right at its end) —
  // move straight on to the next one instead of speaking an empty/near-
  // empty utterance.
  if (!textToSpeak) {
    playChunk(index + 1);
    return;
  }

  chunkIndex = index;
  chunkResumeOffset = resumeOffset;
  currentChunkBoundaryFired = false;

  utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.rate = currentRate;
  utterance.lang = "en-US";

  // Force an actual English voice. Setting lang alone is not enough: the
  // browser still uses the system default voice unless we assign one, which
  // is why a Spanish system voice was reading the English text.
  const voice = getEnglishVoice();
  if (voice) utterance.voice = voice;

  utterance.onstart = () => {
    clearStartWatchdog();
    isSpeaking = true;
    emitState("playing");
  };

  // Tracks progress WITHIN this chunk as the voice crosses word/sentence
  // boundaries. resumeOffset is the base (how much of the chunk we'd
  // already skipped to get here), so this always holds the absolute
  // position inside the original chunk text.
  utterance.onboundary = (e) => {
    currentChunkBoundaryFired = true;
    if (typeof e.charIndex === "number") {
      chunkResumeOffset = resumeOffset + e.charIndex;
    }
  };

  utterance.onend = () => {
    clearStartWatchdog();
    isSpeaking = false;
    chunkResumeOffset = 0; // this chunk finished fully
    // Only auto-advance if this ending was natural (not us pausing/
    // stopping, which also triggers onend via cancel()).
    if (!isPaused) setTimeout(() => playChunk(chunkIndex + 1), RESTART_DELAY_MS);
  };

  utterance.onerror = (e) => {
    clearStartWatchdog();
    isSpeaking = false;
    // cancel() fires onerror with error "interrupted"/"canceled" — that's
    // an intentional pause/stop, not a real failure, so stay quiet.
    if (isPaused || e.error === "interrupted" || e.error === "canceled") return;
    emitState("stopped");
  };

  speechSynthesis.speak(utterance);

  // Watchdog: if this chunk never actually starts, the engine is stuck
  // (or, with network/cloud voices, just slow). Retry a couple of times
  // before finally moving on, so we don't drop content on a slow start.
  startWatchdogTimer = setTimeout(() => {
    if (isPaused) return; // user paused while we were waiting — fine
    speechSynthesis.cancel();
    if (retryCount < MAX_START_RETRIES) {
      playChunk(index, { retryCount: retryCount + 1, resumeOffset });
    } else {
      // Retried enough times with nothing — give up on this chunk rather
      // than hang forever, and continue with the next one.
      console.warn("[LumiVoice] chunk never started, skipping:", chunks[index]);
      playChunk(index + 1);
    }
  }, START_WATCHDOG_MS);
}

/**
 * Reads plain text aloud. Cancels any previous reading.
 * @param {string} text
 * @param {number} [startChunk=0]  chunk index to start from (used to
 *                                 resume after pause/speed change)
 */
export function speakText(text = "", startChunk = 0) {
  if (!text.trim()) return;

  speechSynthesis.cancel();
  isPaused = false;
  chunkResumeOffset = 0;

  currentText = text;
  chunks = splitIntoChunks(text);
  setTimeout(() => playChunk(startChunk), RESTART_DELAY_MS);
}

/**
 * Pauses the current reading.
 *
 * We never call the native speechSynthesis.pause() — it is unreliable in
 * Chromium-based browsers (Edge/Chrome), particularly with "Online
 * (Natural)" voices, where it can silently do nothing or leave resume()
 * producing no audio. Instead we cancel() the sentence currently playing
 * (reliable everywhere) and remember its index so Play can pick it back
 * up from the start of that same sentence.
 */
export function pauseSpeech() {
  if (!isSpeaking || isPaused) return;
  clearStartWatchdog();
  isPaused = true;
  isSpeaking = false;

  if (currentChunkBoundaryFired) {
    // We know exactly where we got to in this sentence — resume there.
    pausedTargetIndex = chunkIndex;
    pausedTargetOffset = chunkResumeOffset;
  } else {
    // This voice never reported word-level progress (common with Edge's
    // "Online/Natural" voices), so we have no idea where mid-sentence we
    // stopped. Repeating the sentence from its start would sound like a
    // stutter, so instead we pick up with the NEXT sentence — nothing is
    // ever repeated, at the cost of skipping the tail of this one.
    pausedTargetIndex = chunkIndex + 1;
    pausedTargetOffset = 0;
  }

  speechSynthesis.cancel();
  emitState("paused");
}

/** Resumes a paused reading from wherever pauseSpeech determined we should. */
export function resumeSpeech() {
  if (!isPaused) return;
  isPaused = false;
  setTimeout(
    () => playChunk(pausedTargetIndex, { resumeOffset: pausedTargetOffset }),
    RESTART_DELAY_MS
  );
}

/** Fully stops any reading. */
export function stopSpeech() {
  clearStartWatchdog();
  isPaused = false;
  speechSynthesis.cancel();
  isSpeaking = false;
  chunkIndex = 0;
  emitState("stopped");
}

/** Restarts the current reading from the very beginning. */
export function restartSpeech() {
  if (!currentText) return;
  speakText(currentText, 0);
}

/**
 * Changes the reading speed. Supported: 0.75, 1, 1.25.
 *
 * The Web Speech API cannot change the rate of an utterance already
 * playing, so we re-speak the current sentence at the new rate. Since we
 * only ever resume at sentence granularity, this is seamless in practice.
 *
 * @param {number} rate
 */
export function setSpeechRate(rate = 1) {
  currentRate = rate;

  if ((isSpeaking || isPaused) && chunks.length) {
    clearStartWatchdog();
    // Reuse whichever position we already know about: if we were paused,
    // pauseSpeech() already decided the right resume point; if we were
    // actively speaking, use the live position tracked via onboundary.
    const targetIndex = isPaused ? pausedTargetIndex : chunkIndex;
    const targetOffset = isPaused ? pausedTargetOffset : chunkResumeOffset;
    isPaused = false;
    speechSynthesis.cancel();
    setTimeout(() => playChunk(targetIndex, { resumeOffset: targetOffset }), RESTART_DELAY_MS);
  }
}

/** true if a reading is in progress (even if paused). */
export function isSpeechPlaying() {
  return isSpeaking || isPaused;
}

/** true if the reading is paused. */
export function isSpeechPaused() {
  return isPaused;
}

// ─── Markdown → readable text ────────────────────────────────

/**
 * Converts Markdown into plain text so the assistant reads it naturally
 * (without ##, **, dashes, etc.).
 * @param {string} markdown
 * @returns {string}
 */
export function extractTextFromMarkdown(markdown = "") {
  const html = marked.parse(markdown || "");
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || "").replace(/\s+/g, " ").trim();
}

/** Reads Markdown content aloud. */
export function speakMarkdown(markdown = "") {
  speakText(extractTextFromMarkdown(markdown));
}

// ─── Screen content extraction ───────────────────────────────
//
// The bar passes these functions whatever is in the current section.
// Only content that makes sense to read is spoken:
//   · contents of type "readme" (Markdown)  ← the lesson material
//   · the welcome message (welcome)
//   · the quizz questions (text + options)
// YouTube videos and Canva embeds are NOT read (they are not text).

/**
 * Joins all readable text of a section to read it "straight through".
 * Receives the `items` object courseView already loads (welcome/contents/quizz).
 *
 * @param {object} section  { welcome, contents, review, quizz }
 * @param {object} [opts]
 * @param {"welcome"|"content"|"quizz"} [opts.only]  read only one part
 * @returns {string} plain text ready for speakText()
 */
export function extractSectionText(section = {}, { only } = {}) {
  if (!section) return "";
  const parts = [];

  // Welcome
  if ((!only || only === "welcome") && section.welcome?.message) {
    parts.push(section.welcome.message);
  }

  // Content: ONLY readme blocks (Markdown). youtube/canva are ignored.
  if (!only || only === "content") {
    const readmes = (section.contents || [])
      .filter((c) => c.tipo === "readme")
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map((c) => {
        const titulo = c.titulo ? `${c.titulo}. ` : "";
        return titulo + extractTextFromMarkdown(c.datos);
      });
    parts.push(...readmes);
  }

  // Quizz: statement + options of each question
  if (only === "quizz" && section.quizz?.questions?.length) {
    parts.push(extractQuizText(section.quizz));
  }

  return parts.filter(Boolean).join(". ").replace(/\.\s*\./g, ".").trim();
}

/**
 * Turns a quizz into readable text: each question with its numbered options
 * ("Option 1: ..."). Never reads which one is correct.
 * @param {object} quiz  { questions: [{ text, options }] }
 * @returns {string}
 */
export function extractQuizText(quiz = {}) {
  const qs = quiz.questions || [];
  return qs.map((q, i) => {
    const opts = (q.options || [])
      .map((opt, oi) => `Option ${oi + 1}: ${opt}`)
      .join(". ");
    return `Question ${i + 1}. ${q.text}. ${opts}`;
  }).join(". ");
}

// ─── User-provided API key ───────────────────────────────────
//
// The user can paste their own Gemini API key from the voice bar settings.
// It is stored only in this browser (localStorage) and sent to the agent
// with each summarize request, so an expired key can be swapped from the UI
// without touching any code or .env file.

const KEY_STORAGE = "lumivoice_api_key";

/** Saves the user's API key in this browser. */
export function setApiKey(key = "") {
  const clean = (key || "").trim();
  if (clean) localStorage.setItem(KEY_STORAGE, clean);
  else localStorage.removeItem(KEY_STORAGE);
}

/** Returns the stored API key, or "" if none. */
export function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || "";
}

/** true if the user has saved a key. */
export function hasApiKey() {
  return !!getApiKey();
}

// ─── AI Summarization (via agent/) ───────────────────────────

/**
 * Sends the lesson text to the agent, which asks the AI model for a short
 * summary. If the user saved their own API key, it is sent along so the
 * agent can use it. The Markdown is converted to plain text first.
 */
export async function summarizeText(markdown = "") {
  const text = extractTextFromMarkdown(markdown);

  // Uses the deployed agent in production, local agent in development.
  const AGENT_URL = import.meta.env.VITE_AGENT_URL || "http://localhost:3001";

  const response = await fetch(`${AGENT_URL}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      apiKey: getApiKey() || undefined,   // user key, if provided
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate summary");
  }

  const data = await response.json();
  return data.summary;
}

/**
 * Generates an AI summary and reads it. If the AI fails, LumiVoice
 * automatically reads the original lesson instead.
 */
export async function summarizeAndSpeak(markdown = "") {
  try {
    const summary = await summarizeText(markdown);
    speakText(summary);
  } catch (error) {
    console.error("AI Summary failed:", error);
    speakMarkdown(markdown);
  }
}

// ─── Compatibility ───────────────────────────────────────────
// Simple alias used by the navbar for a quick test.
export function speak(text = "") {
  speakText(text);
}
