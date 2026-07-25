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
//
// CROSS-BROWSER NOTES (why the extra guards below exist):
//  · Android loads the voice list asynchronously and often returns an empty
//    array on the first call, so we wait for it before speaking.
//  · Privacy browsers (Brave) block the Web Speech API by default as an
//    anti-fingerprinting measure: speak() succeeds but no sound is produced,
//    so we detect the silence and report it.
//  · Safari and iOS never fire `onboundary`, so character progress cannot be
//    tracked there. We estimate it from elapsed time instead, which keeps a
//    speed change from restarting the whole passage.
//  · A device with no English voice pack installed still speaks, using the
//    system default voice, and the UI warns about the accent.
// ─────────────────────────────────────────────────────────────

let utterance = null;
let currentRate = 1;
let isSpeaking = false;

// Text currently being read, and how far we have progressed (char index).
// We track the boundary so a speed change can resume from roughly where the
// voice was, instead of restarting the whole passage from the beginning.
let currentText = "";
let currentCharIndex = 0;

// Time-based fallback for browsers without `onboundary` (Safari, iOS).
// We record when the current utterance started and how many characters into
// the original text it began, so elapsed time can be turned into an offset.
let speechStartedAt = 0;

// Chrome-on-desktop keep-alive. Chrome silently pauses synthesis after ~15s
// of continuous speech due to an internal timer bug. A periodic pause/resume
// resets that timer so long passages read to the end. Harmless on other
// browsers, so we run it everywhere.
let keepAliveTimer = null;
let speechStartOffset = 0;
let sawBoundaryEvent = false;

// Average characters spoken per second at rate = 1. Empirical: normal English
// TTS runs at roughly 14-16 chars/s. Only used when onboundary is missing.
// Tune it if Safari drifts: lower value = resumes earlier in the text.
const CHARS_PER_SECOND = 15;

// Callbacks the UI can register to update its buttons (play/pause) without
// having to poll the state.
let onStateChange = null;


/** true if this browser exposes the Web Speech API at all. */
export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickEnglishVoice() {
  if (!isSpeechSupported()) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;

  // Prefer a LOCAL en-US voice: it starts instantly and needs no network.
  // Network voices (many "Google" ones) stream their audio and can take a
  // couple of seconds to begin on Chrome/Windows, which looked like a failure.
  const isEnUS = (v) => /en[-_]US/i.test(v.lang);
  const isEnAny = (v) => /^en\b|en[-_]/i.test(v.lang);

  return (
    voices.find((v) => isEnUS(v) && v.localService && /natural|samantha|zira|david/i.test(v.name)) ||
    voices.find((v) => isEnUS(v) && v.localService) ||
    voices.find((v) => isEnAny(v) && v.localService) ||
    voices.find((v) => isEnUS(v)) ||          // fall back to a network voice
    voices.find((v) => isEnAny(v)) ||
    null
  );
}

function getEnglishVoice() {
  // ⚠️ Picked FRESH on every call, never cached. A voice object obtained from
  // an earlier getVoices() can become a stale reference in Chrome (after SPA
  // navigations or voice-list refreshes), and speak() with a stale voice
  // fails SILENTLY — no sound, no onerror. That was the "Original does
  // nothing" bug on Windows/Linux Chrome.
  return pickEnglishVoice();
}

/**
 * Waits for the voice list to be populated. On Android the list arrives
 * asynchronously and is often empty on the first call, which is why playback
 * failed silently on some devices: we were creating an utterance before any
 * voice existed. Resolves early once voices arrive, or after `timeout`.
 */
function waitForVoices(timeout = 2000) {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) return resolve([]);

    const existing = speechSynthesis.getVoices();
    if (existing && existing.length) return resolve(existing);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(speechSynthesis.getVoices() || []);
    };

    speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    setTimeout(finish, timeout);
  });
}


/**
 * Best guess of how far into `currentText` the voice currently is.
 *
 * Chrome and Firefox report real word boundaries, so we use the exact value.
 * Safari and iOS never fire `onboundary`, so we estimate from elapsed time:
 * without this, changing the speed there restarted the passage from zero.
 */
function estimatedCharIndex() {
  if (sawBoundaryEvent) return currentCharIndex;
  if (!speechStartedAt) return currentCharIndex;

  const elapsedSec = (Date.now() - speechStartedAt) / 1000;
  const spoken = Math.floor(elapsedSec * CHARS_PER_SECOND * currentRate);
  const guess = speechStartOffset + spoken;

  // Never run past the end of the text.
  return Math.min(guess, Math.max(0, currentText.length - 1));
}

/** Rewinds to the start of the current word so we never clip mid-word. */
function snapToWordStart(text, index) {
  if (index <= 0) return 0;
  const safe = Math.min(index, text.length - 1);
  const prevSpace = text.lastIndexOf(" ", safe);
  return prevSpace > 0 ? prevSpace + 1 : 0;
}

function emitState(state) {
  // state: "playing" | "paused" | "stopped" | "error" | "unsupported"
  //      | "no-english-voice"
  if (typeof onStateChange === "function") onStateChange(state);
}

/**
 * Lets the UI listen to player state changes.
 * @param {(state: "playing"|"paused"|"stopped"|"error"|"unsupported"|"no-english-voice") => void} cb
 */
export function setOnStateChange(cb) {
  onStateChange = cb;
}

/**
 * Chrome pauses synthesis after roughly 15 seconds of continuous speech, a
 * long-standing engine bug. Toggling pause/resume every 10s resets its timer
 * so long passages finish. No-op harm on browsers that don't need it.
 */
function startKeepAlive() {
  stopKeepAlive();
  keepAliveTimer = setInterval(() => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      speechSynthesis.resume();
    }
  }, 10000);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

// ─── Basic playback ──────────────────────────────────────────

/**
 * Reads plain text aloud. Cancels any previous reading.
 * Async because we may need to wait for the device's voice list.
 *
 * @param {string} text
 * @param {number} [startChar=0]  char offset to start from (used to resume
 *                                after a speed change without restarting)
 * @param {object} [opts]
 * @param {boolean} [opts.silent]  do not emit "stopped" while swapping the
 *                                 utterance (used by speed changes, so the
 *                                 UI never flickers back to the play icon)
 */
export function speakText(text = "", startChar = 0, { silent = false } = {}) {
  if (!text.trim()) return;

  // Browser has no Web Speech API at all: tell the UI instead of failing mute.
  if (!isSpeechSupported()) {
    emitState("unsupported");
    return;
  }

  // Cancel whatever is playing. When `silent` we suppress the "stopped"
  // event: a speed change is a continuation, not a stop.
  //
  // ⚠️ Only cancel if something is actually playing or queued. Calling
  // speechSynthesis.cancel() and then speak() in the same turn when nothing
  // was playing leaves Chrome in a broken state where the new utterance is
  // queued but never starts — which is why the Original reading was silent.
  const busy = speechSynthesis.speaking || speechSynthesis.pending || speechSynthesis.paused;
  if (busy) {
    if (silent) {
      speechSynthesis.cancel();
      isSpeaking = false;
    } else {
      stopSpeech();
    }
  }

  // ⚠️ Chrome requires speak() to run in the SAME synchronous turn as the
  // user's click. If we `await` first, Chrome drops the "user gesture" and
  // blocks the voice silently (this broke the Original reading on Chrome).
  //
  // So: if voices are already loaded (Chrome, Safari, desktop) we speak
  // IMMEDIATELY, no await. Only when the list is empty (Android loads it
  // lazily) do we wait — and there, the click-gesture rule is not enforced.
  const voicesReady = speechSynthesis.getVoices().length > 0;
  if (voicesReady) {
    launchUtterance(text, startChar, silent);
  } else {
    waitForVoices().then(() => launchUtterance(text, startChar, silent));
  }
}

/**
 * Builds the utterance and hands it to the engine. Split out from speakText so
 * it can run synchronously right after the click (see the gesture note above).
 */
function launchUtterance(text, startChar, silent, bareVoice = false) {
  // Remember the full text so we can resume from an offset later.
  currentText = text;
  currentCharIndex = startChar > 0 ? startChar : 0;

  // Reset the time-based tracking for this utterance.
  speechStartOffset = currentCharIndex;
  speechStartedAt = 0;
  sawBoundaryEvent = false;

  // If we are resuming from an offset, only speak the remaining slice.
  const toSpeak = startChar > 0 ? text.slice(startChar) : text;

  utterance = new SpeechSynthesisUtterance(toSpeak);
  utterance.rate = currentRate;
  utterance.lang = "en-US";

  // Try to assign an English voice so a Spanish-configured system doesn't
  // read English text with a Spanish voice. If none is found, we DON'T touch
  // utterance.voice at all: lang="en-US" alone lets the browser pick its
  // default, which is exactly what the old, universally-working version did.
  const voice = bareVoice ? null : getEnglishVoice();
  if (voice) {
    try { utterance.voice = voice; } catch { /* keep browser default */ }
  }

  // Track progress: onboundary fires as the voice crosses words/sentences.
  // We store the absolute char index (offset + event index) so we always
  // know how far into the ORIGINAL text we are. Safari never fires this.
  utterance.onboundary = (e) => {
    if (typeof e.charIndex === "number") {
      sawBoundaryEvent = true;
      currentCharIndex = startChar + e.charIndex;
    }
  };

  utterance.onstart = () => {
    // May already have been flipped by the poll below (network voices on
    // Chrome sometimes never fire this event, so we can't rely on it alone).
    if (isSpeaking) return;
    isSpeaking = true;
    speechStartedAt = Date.now();   // baseline for the time estimate
    startKeepAlive();               // prevent Chrome's ~15s auto-pause
    emitState("playing");
  };

  utterance.onend = () => {
    isSpeaking = false;
    currentCharIndex = 0;   // finished: reset progress
    speechStartedAt = 0;
    stopKeepAlive();
    emitState("stopped");
  };

  utterance.onerror = (e) => {
    isSpeaking = false;
    speechStartedAt = 0;
    stopKeepAlive();
    // "interrupted" and "canceled" happen whenever WE stop on purpose
    // (new reading, speed change, closing the bar): not real failures.
    if (e?.error && !["interrupted", "canceled"].includes(e.error)) {
      emitState("error");
    } else if (!silent) {
      emitState("stopped");
    }
  };

  speechSynthesis.speak(utterance);

  // No English voice on this device (common on Android without the Google
  // TTS English pack). We speak anyway, but the UI explains the accent.
  if (!voice) emitState("no-english-voice");

  // Brave and other privacy browsers accept speak() without ever producing
  // sound or firing onerror. If nothing started after a while, report it.
  //
  // The window is generous (3.5s) because Chrome on Windows can take a couple
  // of seconds to start a NETWORK voice (the "Google" voices stream their
  // audio). A shorter timeout produced false "error" reports there.
  // ── Startup + failure detection by POLLING, not by trusting onstart ──
  //
  // Root cause of the "Original does nothing" bug on Chrome/Windows: with a
  // NETWORK voice ("Google US English"), Chrome often does NOT fire onstart
  // even though audio is playing. The old code relied on onstart to flip the
  // state and to decide the utterance had failed, so a working voice looked
  // dead and the watchdog cancelled it.
  //
  // speechSynthesis.speaking IS reliable, so we poll it. As soon as the engine
  // reports it's speaking, we mark playing ourselves (in case onstart never
  // fires). If after the whole window it never started AND isn't pending, only
  // then is it a real failure.
  const watchdogText = currentText;
  let waited = 0;
  const POLL = 250;
  const MAX_WAIT = 4000;   // network voices can take a few seconds to begin

  const poll = setInterval(() => {
    // A newer utterance replaced this one: stop watching.
    if (currentText !== watchdogText) { clearInterval(poll); return; }

    // Engine is speaking. If onstart never fired, flip the state now.
    if (speechSynthesis.speaking) {
      clearInterval(poll);
      if (!isSpeaking) {
        isSpeaking = true;
        if (!speechStartedAt) speechStartedAt = Date.now();
        startKeepAlive();
        emitState("playing");
      }
      return;
    }

    // Still queued (pending) — keep waiting, this is normal for network voices.
    waited += POLL;
    if (waited < MAX_WAIT) return;

    // Time's up and nothing ever played.
    clearInterval(poll);
    if (isSpeaking || speechSynthesis.speaking) return;   // it did start, we're fine

    // One recovery attempt with no voice object (lang-only), like the old
    // version that worked everywhere. Only if THAT also stays silent is it a
    // genuine failure (Brave blocking, or no speech engine at all).
    if (!bareVoice) {
      speechSynthesis.cancel();
      launchUtterance(text, startChar, silent, true);
    } else {
      emitState("error");
    }
  }, POLL);
}

/** Pauses the current reading. */
export function pauseSpeech() {
  if (!isSpeechSupported()) return;
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    // Freeze the time estimate at the current position before pausing,
    // otherwise the elapsed clock keeps running while the voice is silent.
    currentCharIndex = estimatedCharIndex();
    speechStartOffset = currentCharIndex;
    speechStartedAt = 0;

    speechSynthesis.pause();
    emitState("paused");
  }
}

/** Resumes a paused reading. */
export function resumeSpeech() {
  if (!isSpeechSupported()) return;
  if (speechSynthesis.paused) {
    speechStartedAt = Date.now();   // restart the estimate clock
    speechSynthesis.resume();
    emitState("playing");
  }
}

/** Fully stops any reading. */
export function stopSpeech() {
  if (!isSpeechSupported()) return;
  stopKeepAlive();
  speechSynthesis.cancel();
  isSpeaking = false;
  speechStartedAt = 0;
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
 * IMPORTANT: the Web Speech API cannot change the rate of an utterance that
 * is already playing; the spec does not allow it. The only way to apply a new
 * speed is to cancel and speak again. To avoid restarting from the top we
 * resume from the current position:
 *
 *   · Chrome / Firefox → exact position from `onboundary`.
 *   · Safari / iOS     → estimated from elapsed time (no boundary events).
 *
 * The swap is done in `silent` mode so the UI never flickers back to the
 * play icon mid-reading.
 *
 * @param {number} rate
 */
export function setSpeechRate(rate = 1) {
  const previousRate = currentRate;

  if (!isSpeechSupported()) { currentRate = rate; return; }

  const wasSpeaking = speechSynthesis.speaking;
  const wasPaused = speechSynthesis.paused;

  // Compute the position BEFORE changing the rate: the time estimate depends
  // on the speed that was actually in use up to this moment.
  let resumeAt = 0;
  if ((wasSpeaking || wasPaused) && currentText) {
    currentRate = previousRate;              // ensure the estimate uses the old rate
    resumeAt = snapToWordStart(currentText, estimatedCharIndex());
  }

  currentRate = rate;

  // Nothing playing: the new rate simply applies to the next reading.
  if (!wasSpeaking && !wasPaused) return;
  if (!currentText) return;

  // Re-speak from where we are, silently, so the new rate takes effect from
  // the current position instead of the start.
  speakText(currentText, resumeAt, { silent: true });

  // If the user changed speed while PAUSED, keep it paused at the new rate
  // rather than surprising them with audio starting on its own.
  if (wasPaused) {
    setTimeout(() => {
      if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        emitState("paused");
      }
    }, 60);
  }
}

/** true if a reading is in progress (even if paused). */
export function isSpeechPlaying() {
  return isSpeechSupported() && speechSynthesis.speaking;
}

/** true if the reading is paused. */
export function isSpeechPaused() {
  return isSpeechSupported() && speechSynthesis.paused;
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
//
// NOTE: this is completely independent of the speech engine. It is a plain
// HTTP request, so it works on every browser and device even when the voice
// itself does not. That is why "Summarize with AI" appeared to work on
// devices where nothing was ever heard: the summary arrived fine, and only
// the reading step failed.

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
