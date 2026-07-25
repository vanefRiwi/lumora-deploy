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
 * Splits text into sentence-ish chunks so we can play/pause between them.
 * Falls back to the whole text as a single chunk if no sentence breaks
 * are found (e.g. a single long clause with no punctuation).
 */
function splitIntoChunks(text) {
  const matches = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g);
  const pieces = (matches || [text])
    .map((s) => s.trim())
    .filter(Boolean);
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

/**
 * Speaks a single chunk by index. Recursively moves on to the next chunk
 * on natural completion, unless we've been paused/stopped in the meantime.
 */
function playChunk(index) {
  if (index < 0 || index >= chunks.length) {
    // Reached the end of the text.
    isSpeaking = false;
    isPaused = false;
    chunkIndex = 0;
    emitState("stopped");
    return;
  }

  chunkIndex = index;

  utterance = new SpeechSynthesisUtterance(chunks[index]);
  utterance.rate = currentRate;
  utterance.lang = "en-US";

  // Force an actual English voice. Setting lang alone is not enough: the
  // browser still uses the system default voice unless we assign one, which
  // is why a Spanish system voice was reading the English text.
  const voice = getEnglishVoice();
  if (voice) utterance.voice = voice;

  utterance.onstart = () => {
    isSpeaking = true;
    emitState("playing");
  };

  utterance.onend = () => {
    isSpeaking = false;
    // Only auto-advance if this ending was natural (not us pausing/
    // stopping, which also triggers onend via cancel()).
    if (!isPaused) playChunk(chunkIndex + 1);
  };

  utterance.onerror = (e) => {
    isSpeaking = false;
    // cancel() fires onerror with error "interrupted"/"canceled" — that's
    // an intentional pause/stop, not a real failure, so stay quiet.
    if (isPaused || e.error === "interrupted" || e.error === "canceled") return;
    emitState("stopped");
  };

  speechSynthesis.speak(utterance);
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

  currentText = text;
  chunks = splitIntoChunks(text);
  playChunk(startChunk);
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
  isPaused = true;
  isSpeaking = false;
  speechSynthesis.cancel();
  emitState("paused");
}

/** Resumes a paused reading by re-speaking the sentence we paused on. */
export function resumeSpeech() {
  if (!isPaused) return;
  isPaused = false;
  playChunk(chunkIndex);
}

/** Fully stops any reading. */
export function stopSpeech() {
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
    isPaused = false;
    playChunk(chunkIndex);
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
