import { marked } from "marked";

// ─────────────────────────────────────────────────────────────
// LumiVoice · Text-To-Speech Service (Cross-Browser Fix)
// ─────────────────────────────────────────────────────────────

let utterance = null;
let currentRate = 1;
let isSpeaking = false;
let isPausedState = false; // Estado manual para soportar Edge/Chrome sin fallos

let currentText = "";
let currentCharIndex = 0;

let onStateChange = null;
let englishVoice = null;

function pickEnglishVoice() {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;

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

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.onvoiceschanged = () => { englishVoice = pickEnglishVoice(); };
}

function emitState(state) {
  // state: "playing" | "paused" | "stopped"
  if (typeof onStateChange === "function") onStateChange(state);
}

export function setOnStateChange(cb) {
  onStateChange = cb;
}

// ─── Basic playback ──────────────────────────────────────────

/**
 * Reads plain text aloud. Cancels any previous reading.
 * @param {string} text
 * @param {number} [startChar=0] Offset de caracter desde donde iniciar
 */
export function speakText(text = "", startChar = 0) {
  if (!text.trim()) return;

  // Cancelamos directamente sin disparar eventos de error no deseados
  if (typeof speechSynthesis !== "undefined") {
    speechSynthesis.cancel();
  }

  currentText = text;
  currentCharIndex = startChar > 0 ? startChar : 0;
  isPausedState = false;

  const toSpeak = startChar > 0 ? text.slice(startChar) : text;

  utterance = new SpeechSynthesisUtterance(toSpeak);
  utterance.rate = currentRate;
  utterance.lang = "en-US";

  const voice = getEnglishVoice();
  if (voice) utterance.voice = voice;

  utterance.onboundary = (e) => {
    if (typeof e.charIndex === "number") {
      currentCharIndex = startChar + e.charIndex;
    }
  };

  utterance.onstart = () => {
    isSpeaking = true;
    isPausedState = false;
    emitState("playing");
  };

  utterance.onend = () => {
    // Si terminamos por una pausa manual, ignoramos el evento de fin total
    if (isPausedState) return;

    isSpeaking = false;
    currentCharIndex = 0;
    emitState("stopped");
  };

  utterance.onerror = (e) => {
    // Edge/Chrome emiten 'interrupted' o 'canceled' cuando pausamos usando cancel()
    if (e.error === "interrupted" || e.error === "canceled") return;

    isSpeaking = false;
    isPausedState = false;
    emitState("stopped");
  };

  speechSynthesis.speak(utterance);
}

/** Pauses the current reading reliably across all browsers. */
export function pauseSpeech() {
  if (!isSpeaking || isPausedState) return;

  isPausedState = true;
  isSpeaking = false;

  // En lugar de speechSynthesis.pause() que falla en Edge/Chrome,
  // cancelamos el utterance actual pero conservamos `currentCharIndex`.
  speechSynthesis.cancel();
  emitState("paused");
}

/** Resumes a paused reading. */
export function resumeSpeech() {
  if (!isPausedState || !currentText) return;

  // Reanudamos desde el índice donde se detuvo el texto
  speakText(currentText, currentCharIndex);
}

/** Fully stops any reading. */
export function stopSpeech() {
  isSpeaking = false;
  isPausedState = false;
  currentCharIndex = 0;
  currentText = "";

  if (typeof speechSynthesis !== "undefined") {
    speechSynthesis.cancel();
  }
  emitState("stopped");
}

/** Restarts the current reading from the very beginning. */
export function restartSpeech() {
  if (!currentText) return;
  speakText(currentText, 0);
}

/**
 * Changes the reading speed.
 * @param {number} rate
 */
export function setSpeechRate(rate = 1) {
  currentRate = rate;

  if ((isSpeaking || isPausedState) && currentText) {
    const resumeAt = Math.max(0, currentCharIndex);
    speakText(currentText, resumeAt);
  }
}

/** true if a reading is active (playing or paused). */
export function isSpeechPlaying() {
  return isSpeaking;
}

/** true if the reading is paused. */
export function isSpeechPaused() {
  return isPausedState;
}

// ─── Markdown → readable text ────────────────────────────────

export function extractTextFromMarkdown(markdown = "") {
  const html = marked.parse(markdown || "");
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || "").replace(/\s+/g, " ").trim();
}

export function speakMarkdown(markdown = "") {
  speakText(extractTextFromMarkdown(markdown));
}

// ─── Screen content extraction ───────────────────────────────

export function extractSectionText(section = {}, { only } = {}) {
  if (!section) return "";
  const parts = [];

  if ((!only || only === "welcome") && section.welcome?.message) {
    parts.push(section.welcome.message);
  }

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

  if (only === "quizz" && section.quizz?.questions?.length) {
    parts.push(extractQuizText(section.quizz));
  }

  return parts.filter(Boolean).join(". ").replace(/\.\s*\./g, ".").trim();
}

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

const KEY_STORAGE = "lumivoice_api_key";

export function setApiKey(key = "") {
  const clean = (key || "").trim();
  if (clean) localStorage.setItem(KEY_STORAGE, clean);
  else localStorage.removeItem(KEY_STORAGE);
}

export function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || "";
}

export function hasApiKey() {
  return !!getApiKey();
}

// ─── AI Summarization (via agent/) ───────────────────────────

export function summarizeText(markdown = "") {
  const text = extractTextFromMarkdown(markdown);
  const AGENT_URL = import.meta.env.VITE_AGENT_URL || "http://localhost:3001";

  return fetch(`${AGENT_URL}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      apiKey: getApiKey() || undefined,
    }),
  }).then((response) => {
    if (!response.ok) throw new Error("Failed to generate summary");
    return response.json();
  }).then((data) => data.summary);
}

export function summarizeAndSpeak(markdown = "") {
  return summarizeText(markdown)
    .then((summary) => speakText(summary))
    .catch((error) => {
      console.error("AI Summary failed:", error);
      speakMarkdown(markdown);
    });
}

export function speak(text = "") {
  speakText(text);
}
