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

let utterance = null;
let currentRate = 1;
let isSpeaking = false;

// Text currently being read, and how far we have progressed (char index).
// We track the boundary so a speed change can resume from roughly where the
// voice was, instead of restarting the whole passage from the beginning.
let currentText = "";
let currentCharIndex = 0;

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
 * Reads plain text aloud. Cancels any previous reading.
 * @param {string} text
 * @param {number} [startChar=0]  char offset to start from (used to resume
 *                                after a speed change without restarting)
 */
export function speakText(text = "", startChar = 0) {
  if (!text.trim()) return;

  stopSpeech();

  // Remember the full text so we can resume from an offset later.
  currentText = text;
  currentCharIndex = startChar > 0 ? startChar : 0;

  // If we are resuming from an offset, only speak the remaining slice.
  const toSpeak = startChar > 0 ? text.slice(startChar) : text;

  utterance = new SpeechSynthesisUtterance(toSpeak);
  utterance.rate = currentRate;
  utterance.lang = "en-US";

  // Force an actual English voice. Setting lang alone is not enough: the
  // browser still uses the system default voice unless we assign one, which
  // is why a Spanish system voice was reading the English text.
  const voice = getEnglishVoice();
  if (voice) utterance.voice = voice;

  // Track progress: onboundary fires as the voice crosses words/sentences.
  // We store the absolute char index (offset + event index) so we always
  // know how far into the ORIGINAL text we are.
  utterance.onboundary = (e) => {
    if (typeof e.charIndex === "number") {
      currentCharIndex = startChar + e.charIndex;
    }
  };

  utterance.onstart = () => { isSpeaking = true; emitState("playing"); };
  utterance.onend   = () => {
    isSpeaking = false;
    currentCharIndex = 0;   // finished: reset progress
    emitState("stopped");
  };
  utterance.onerror = () => { isSpeaking = false; emitState("stopped"); };

  speechSynthesis.speak(utterance);
}

/** Pauses the current reading. */
export function pauseSpeech() {
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
    emitState("paused");
  }
}

/** Resumes a paused reading. */
export function resumeSpeech() {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    emitState("playing");
  }
}

/** Fully stops any reading. */
export function stopSpeech() {
  speechSynthesis.cancel();
  isSpeaking = false;
  emitState("stopped");
}

/** Restarts the current reading from the very beginning. */
export function restartSpeech() {
  if (!currentText) return;
  speakText(currentText, 0);
}

/**
 * Changes the reading speed. Supported: 0.75, 1, 1.5.
 *
 * IMPORTANT: the Web Speech API cannot change the rate of an utterance that
 * is already playing. To apply the new speed WITHOUT restarting from the
 * top, we continue reading from the last word boundary we tracked. The
 * result is a near-seamless speed change from roughly the current position.
 *
 * @param {number} rate
 */
export function setSpeechRate(rate = 1) {
  currentRate = rate;

  // If something is playing (or paused), re-speak from where we are so the
  // new rate takes effect from the current position, not from the start.
  const wasPlaying = speechSynthesis.speaking || speechSynthesis.paused;
  if (wasPlaying && currentText) {
    // Back up a couple of chars so we do not clip mid-word.
    const resumeAt = Math.max(0, currentCharIndex);
    speakText(currentText, resumeAt);
  }
}

/** true if a reading is in progress (even if paused). */
export function isSpeechPlaying() {
  return speechSynthesis.speaking;
}

/** true if the reading is paused. */
export function isSpeechPaused() {
  return speechSynthesis.paused;
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
