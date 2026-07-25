import { marked } from "marked";

// ─────────────────────────────────────────────────────────────
// LumiVoice · Text-To-Speech Service
//
// Toda la lógica de voz vive aquí. La UI (voiceAssistantBar.js)
// SOLO llama a estas funciones exportadas: nunca toca speechSynthesis
// directamente. Ese es el mismo patrón de service que usa el resto del
// proyecto (courseService.js, contentService.js).
//
//   Frontend (voiceAssistantBar) → ttsService → SpeechSynthesis (navegador)
//                                            └→ agent/ (solo el summarize)
//
// El TTS corre 100% en el navegador con la API nativa SpeechSynthesis:
// sin backend, sin API key, sin costo. Solo `summarizeText` toca el agent.
// ─────────────────────────────────────────────────────────────

let utterance = null;
let currentRate = 1;
let isSpeaking = false;

// Callbacks que la UI puede registrar para actualizar sus botones
// (play/pause) sin tener que sondear el estado.
let onStateChange = null;

function emitState(state) {
  // state: "playing" | "paused" | "stopped"
  if (typeof onStateChange === "function") onStateChange(state);
}

/**
 * Permite a la UI escuchar cambios de estado del reproductor.
 * @param {(state: "playing"|"paused"|"stopped") => void} cb
 */
export function setOnStateChange(cb) {
  onStateChange = cb;
}

// ─── Reproducción básica ─────────────────────────────────────

/**
 * Lee texto plano en voz alta. Cancela cualquier lectura anterior.
 * @param {string} text
 */
export function speakText(text = "") {
  if (!text.trim()) return;

  stopSpeech();

  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = currentRate;
  utterance.lang = "en-US";

  utterance.onstart = () => { isSpeaking = true; emitState("playing"); };
  utterance.onend   = () => { isSpeaking = false; emitState("stopped"); };
  utterance.onerror = () => { isSpeaking = false; emitState("stopped"); };

  speechSynthesis.speak(utterance);
}

/** Pausa la lectura actual. */
export function pauseSpeech() {
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
    emitState("paused");
  }
}

/** Reanuda una lectura pausada. */
export function resumeSpeech() {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    emitState("playing");
  }
}

/** Detiene por completo cualquier lectura. */
export function stopSpeech() {
  speechSynthesis.cancel();
  isSpeaking = false;
  emitState("stopped");
}

/**
 * Cambia la velocidad de lectura. Soportadas: 0.75, 1, 1.5.
 * Si ya se está leyendo algo, reinicia con la nueva velocidad para
 * que el cambio se aplique al instante.
 * @param {number} rate
 */
export function setSpeechRate(rate = 1) {
  currentRate = rate;
}

/** true si hay una lectura en curso (aunque esté pausada). */
export function isSpeechPlaying() {
  return speechSynthesis.speaking;
}

/** true si la lectura está pausada. */
export function isSpeechPaused() {
  return speechSynthesis.paused;
}

// ─── Markdown → texto legible ────────────────────────────────

/**
 * Convierte Markdown en texto plano para que el asistente lo lea
 * de forma natural (sin ##, **, guiones, etc.).
 * @param {string} markdown
 * @returns {string}
 */
export function extractTextFromMarkdown(markdown = "") {
  const html = marked.parse(markdown || "");
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || "").replace(/\s+/g, " ").trim();
}

/** Lee contenido Markdown en voz alta. */
export function speakMarkdown(markdown = "") {
  speakText(extractTextFromMarkdown(markdown));
}

// ─── Extracción del contenido de la pantalla ─────────────────
//
// La barra le pasa a estas funciones lo que hay en la sección actual.
// Solo se lee lo que tiene sentido leer:
//   · contents de tipo "readme" (Markdown)  ← el material de la lección
//   · el mensaje de bienvenida (welcome)
//   · las preguntas del quizz (texto + opciones)
// Los videos de YouTube y los embeds de Canva NO se leen (no son texto).

/**
 * Junta todo el texto legible de una sección para leerla "de corrido".
 * Recibe el objeto `items` que ya carga courseView (welcome/contents/quizz).
 *
 * @param {object} section  { welcome, contents, review, quizz }
 * @param {object} [opts]
 * @param {"welcome"|"content"|"quizz"} [opts.only]  leer solo una parte
 * @returns {string} texto plano listo para speakText()
 */
export function extractSectionText(section = {}, { only } = {}) {
  if (!section) return "";
  const parts = [];

  // Bienvenida
  if ((!only || only === "welcome") && section.welcome?.message) {
    parts.push(section.welcome.message);
  }

  // Contenido: SOLO los bloques readme (Markdown). Se ignoran youtube/canva.
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

  // Quizz: enunciado + opciones de cada pregunta
  if (only === "quizz" && section.quizz?.questions?.length) {
    parts.push(extractQuizText(section.quizz));
  }

  return parts.filter(Boolean).join(". ").replace(/\.\s*\./g, ".").trim();
}

/**
 * Convierte un quizz en texto leíble: cada pregunta con sus opciones
 * numeradas ("Option 1: ..."). Nunca lee cuál es la correcta.
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

// ─── AI Summarization (vía agent/) ───────────────────────────

/**
 * Placeholder for AI summarization.
 *
 * Later this function will call:
 *
 * Frontend
 *      ↓
 * Agent
 *      ↓
 * OpenAI / Gemini
 *
 */
export async function summarizeText(markdown = "") {

    const text = extractTextFromMarkdown(markdown);

    const response = await fetch("http://localhost:3001/summary", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text,
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to generate summary");
    }

    const data = await response.json();

    return data.summary;

}
/**
 * Generates an AI summary and reads it.
 *
 * If the AI fails,
 * LumiVoice automatically reads
 * the original lesson instead.
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

// ─── Compatibilidad ──────────────────────────────────────────
// Alias simple usado por el navbar para una prueba rápida.
export function speak(text = "") {
  speakText(text);
}
