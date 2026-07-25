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

// Cached English voice. The browser loads voices asynchronously, so we pick
// one lazily and remember it. Without this, speechSynthesis uses the system
// default voice (which on a Spanish-configured Mac is a Spanish voice trying
// to pronounce English words, hence the odd accent).
let englishVoice = null;

/** true if this browser exposes the Web Speech API at all. */
export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickEnglishVoice() {
  if (!isSpeechSupported()) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;

  const isEnUS = (v) => /en[-_]US/i.test(v.lang);
  const isEnAny = (v) => /^en\b|en[-_]/i.test(v.lang);

  // LOCAL voices ONLY. Network voices ("Google US English [net]", etc.) are
  // BROKEN on desktop Chrome for Windows/Linux: assigning one makes speak()
  // report speaking=true, never fire onstart, and produce NO audio at all
  // (verified on the affected machines). Never fall back to them.
  //
  // If no local English voice exists we return null on purpose: the caller
  // then leaves utterance.voice unset and relies on utterance.lang="en-US",
  // which routes through the OS default synthesis path (SAPI on Windows)
  // and DOES produce sound.
  return (
    voices.find((v) => isEnUS(v) && v.localService && /natural|samantha|zira|david/i.test(v.name)) ||
    voices.find((v) => isEnUS(v) && v.localService) ||
    voices.find((v) => isEnAny(v) && v.localService) ||
    null
  );
}

function getEnglishVoice() {
  if (englishVoice) return englishVoice;
  englishVoice = pickEnglishVoice();
  return englishVoice;
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
      englishVoice = pickEnglishVoice();   // refresh the cache
      resolve(speechSynthesis.getVoices() || []);
    };

    speechSynthesis.addEventListener("voiceschanged", finish, { once: true });
    setTimeout(finish, timeout);
  });
}

// Voices may not be ready at load time; refresh the cache when they arrive.
if (isSpeechSupported()) {
  speechSynthesis.onvoiceschanged = () => { englishVoice = pickEnglishVoice(); };
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

  // ⚠️ Chrome requires speak() to run in the SAME synchronous turn as the
  // user's click. If we `await` first, Chrome drops the "user gesture" and
  // blocks the voice silently (this broke the Original reading on Chrome).
  //
  // So: if voices are already loaded (Chrome, Safari, desktop) we speak
  // IMMEDIATELY, no await. Only when the list is empty (Android loads it
  // lazily) do we wait — and there, the click-gesture rule is not enforced.
  const voicesReady = speechSynthesis.getVoices().length > 0;

  const launch = () => {
    if (voicesReady) {
      launchUtterance(text, startChar, silent);
    } else {
      waitForVoices().then(() => launchUtterance(text, startChar, silent));
    }
  };

  if (busy) {
    // Something was already playing/queued. cancel() + speak() in the SAME
    // turn is the pattern that leaves Chrome stuck (utterance queued, never
    // starts) — verified on the affected Windows machine. So cancel now, let
    // the engine settle for one frame, then speak. The user gesture is not
    // needed here because audio was already running in this session.
    if (silent) {
      speechSynthesis.cancel();
      isSpeaking = false;
    } else {
      stopSpeech();
    }
    setTimeout(launch, 250);
  } else {
    // Nothing was playing: speak immediately in the same turn as the click so
    // Chrome keeps the user gesture. No cancel(), so nothing to recover from.
    launch();
  }
}

/**
 * Builds the utterance and hands it to the engine. Split out from speakText so
 * it can run synchronously right after the click (see the gesture note above).
 */
function launchUtterance(text, startChar, silent) {
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

  // Assign a LOCAL English voice when one exists (Mac: Samantha, some Windows
  // installs: Microsoft Zira/David). When none exists we deliberately leave
  // utterance.voice UNSET: utterance.lang = "en-US" alone makes the browser
  // use its OS default synthesis path, which works on Chrome/Windows where
  // the only listed English voices are the broken Google network ones.
  const voice = getEnglishVoice();
  if (voice) utterance.voice = voice;

  // Track progress: onboundary fires as the voice crosses words/sentences.
  // We store the absolute char index (offset + event index) so we always
  // know how far into the ORIGINAL text we are. Safari never fires this.
  utterance.onboundary = (e) => {
    if (typeof e.charIndex === "number") {
      sawBoundaryEvent = true;
      currentCharIndex = startChar + e.charIndex;
    }
  };

  // Per-utterance flag the watchdog trusts. Some engines (this Windows box)
  // take several seconds to fire onstart for the OS default English voice.
  // The watchdog must NOT declare failure just because onstart is slow, only
  // if it TRULY never fires — so onstart flips this and the watchdog checks it.
  let started = false;

  utterance.onstart = () => {
    started = true;
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

  // Warn ONLY when the device truly has no English voice of any kind
  // (e.g. Android without the English TTS pack). Skipping a broken network
  // voice is NOT that case: the lang="en-US" fallback still speaks English.
  const hasAnyEnglish = speechSynthesis
    .getVoices()
    .some((v) => /^en\b|en[-_]/i.test(v.lang));
  if (!voice && !hasAnyEnglish) emitState("no-english-voice");

  // Watchdog: catches the case where the engine accepts speak() but audio
  // NEVER starts and no onerror fires (Brave blocks the API outright).
  //
  // Crucially, it keys off the per-utterance `started` flag set by onstart,
  // NOT off speechSynthesis.speaking. On this Windows machine the default
  // English voice can take a few seconds to fire onstart, and the old
  // watchdog was cancelling that perfectly good reading as a false "zombie".
  // If onstart fired at all, there is nothing wrong — we bail out.
  //
  // Window widened to 6s to comfortably clear slow OS-default voice startup.
  const watchdogText = currentText;
  setTimeout(() => {
    if (started) return;                        // onstart fired: all good
    if (currentText !== watchdogText) return;   // a newer reading took over
    if (speechSynthesis.paused) return;         // user paused before it began

    // onstart never fired AND this is still the current reading: genuine
    // silent failure. Distinguish a fully blocked engine from a stuck one
    // only for the log; the recovery is the same.
    const reason = speechSynthesis.speaking ? "zombie-voice" : "engine-blocked";
    handleSilentFailure(reason);
  }, 6000);
}

/**
 * A reading was accepted by the engine but no audio ever started.
 * We tell the UI, and we also try to SAY the reason out loud through the
 * OS-default path (a bare utterance with NO voice assigned), because that
 * path keeps working even when the listed voices are broken. If even that
 * stays silent (e.g. Brave blocking the whole API), only the UI message
 * remains — there is nothing left that can produce sound.
 *
 * @param {"zombie-voice"|"engine-blocked"} reason
 */
function handleSilentFailure(reason) {
  stopKeepAlive();
  speechSynthesis.cancel();   // clear the stuck utterance
  isSpeaking = false;
  emitState("error");

  const message =
    reason === "zombie-voice"
      ? "LumiVoice no pudo usar la voz seleccionada. Las voces de red de este navegador están dañadas, así que estoy usando la voz por defecto del sistema. Vuelve a presionar el botón para escuchar la lección."
      : "LumiVoice no pudo reproducir audio. Es posible que este navegador bloquee la síntesis de voz. Revisa los permisos de sonido o prueba en otro navegador.";

  console.warn(`[LumiVoice] Silent failure (${reason}): ${message}`);

  // Bare utterance: NO voice assigned, system default path. This is the same
  // configuration that was verified to work on the affected Chrome/Windows
  // machine when every listed voice failed.
  // We already called speechSynthesis.cancel() above. Calling speak() in the
  // SAME turn right after cancel() is exactly the pattern that leaves Chrome
  // stuck (utterance queued, never starts) — confirmed on the affected
  // machine. Since we are already inside a setTimeout (no user gesture to
  // preserve), give the engine a short breath before speaking the message.
  setTimeout(() => {
    try {
      const diag = new SpeechSynthesisUtterance(message);
      diag.lang = "es-ES";
      diag.volume = 1;
      diag.rate = 1;
      speechSynthesis.speak(diag);
    } catch {
      /* nothing else can be done audibly */
    }
  }, 250);

  // If the failure was the broken network voice, stop trusting the cached
  // voice for the rest of the session: next readings go straight through the
  // working default path.
  if (reason === "zombie-voice") englishVoice = null;
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
