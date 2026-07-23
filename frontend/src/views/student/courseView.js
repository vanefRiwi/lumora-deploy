// ─── Course View (Student) ────────────────────────────────────────────────────
// Section sidebar with PROGRESSIVE LOCK + Content/Leaderboard/Grades tabs.
//
// Unlock rules:
//   - A section's Quiz unlocks the NEXT section.
//   - Completing all quizzes unlocks the Final Assessment.
//
// Data from services/courseService.js (today mock, tomorrow the real API).
// Also serves as "Preview as student" for the tutor (?preview=1).

// ─── Course View (Student) ────────────────────────────────────────────────────
// Sidebar de secciones con LOCK PROGRESIVO + pestañas Content/Leaderboard/Grades.
//
// Reglas de desbloqueo:
//   - El Quizz de una sección desbloquea la SIGUIENTE sección.
//   - Completar todos los quizzes desbloquea el Final Assessment.
//
// Datos desde services/courseService.js (hoy mock, mañana la API real).
// Sirve también como "Preview as student" para el tutor (?preview=1).

import { navbar, initNavbar } from "../../components/navbar.js";
import { closeBar } from "../../components/voiceAssistantBar.js";
import { renderContentList } from "../../components/contentRenderer.js";
import { navigate } from "../../router/router.js";
import { getSession } from "../../helpers/auth.js";
import { getCourseById } from "../../data/courses.js";
import {
  getSections, getSectionItems, getFinalAssessment, getLeaderboard,
  getProgress, submitQuizz, submitReview, submitFinal,
  isSectionUnlocked, isFinalUnlocked, calculateFinalGrade,
} from "../../services/courseService.js";

const icon = {
  back: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
  cap: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  play: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>`,
  video: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>`,
  clip: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
  quiz: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
  lock: `<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  check: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  chevron: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  trophy: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  award: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  checkCircle: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  trophySm: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  eye: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
};

// ─── Estado ──────────────────────────────────────────────────────────────────
let courseId = null, course = null, sections = [], items = null;
let progress = { quizzes: {}, reviews: {}, final: null };
let finalAssessment = null, leaderboard = [];
let selSection = null, selItem = "welcome", selTab = "content";
let previewMode = false;
let previewFrom = null;   // "editor" | null -> a dónde volver al salir del preview
let answers = {}, feedback = null;

function emptyBox(msg) {
  return `<div class="rounded-xl p-8 text-center text-sm" style="background: var(--card); border: 1px solid var(--border); color: var(--muted-foreground)">${msg}</div>`;
}

// ─── Sidebar con lock progresivo ─────────────────────────────────────────────
function sidebar() {
  const ITEMS = [
    { key: "welcome", label: "Welcome", ic: icon.play },
    { key: "content", label: "Content", ic: icon.video },
    { key: "review",  label: "Review",  ic: icon.clip },
    { key: "quizz",   label: "Quizz",   ic: icon.quiz },
  ];

  const list = sections.map((sec) => {
    const unlocked = isSectionUnlocked(sections, sec.id, progress);
    const quizDone = Boolean(progress.quizzes[sec.id]);

    const subitems = ITEMS.map((it) => {
      const locked = !unlocked;
      const active = selSection === sec.id && selItem === it.key && selTab === "content";

      let badge = "";
      if (it.key === "quizz") {
        badge = quizDone
          ? `<span style="color: ${active ? "#fff" : "var(--primary)"}">${icon.check}</span>`
          : locked
            ? `<span>${icon.lock}</span>`
            : `<span class="w-3.5 h-3.5 rounded-full border-2 inline-block" style="border-color: var(--primary)"></span>`;
      }

      return `
        <button data-sec="${sec.id}" data-item="${it.key}" ${locked ? "disabled" : ""}
          class="js-item w-full flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-lg text-sm transition-all mb-0.5 ${locked ? "cursor-not-allowed" : ""}"
          style="background: ${active ? "var(--primary)" : "transparent"};
                 color: ${active ? "#fff" : locked ? "var(--muted-foreground)" : "var(--foreground)"};
                 opacity: ${locked ? ".55" : "1"}">
          ${it.ic}<span class="flex-1 text-left">${it.label}</span>${badge}
        </button>`;
    }).join("");

    return `
      <div class="mb-3">
        <div class="flex items-center gap-1.5 px-2 py-1 text-sm font-semibold">
          ${icon.chevron}<span>${sec.title}</span>
        </div>
        ${subitems}
        ${!unlocked ? `<p class="pl-6 text-xs italic mt-0.5" style="color: var(--muted-foreground)">Complete the previous quiz to unlock</p>` : ""}
      </div>`;
  }).join("");

  const finalUnlocked = isFinalUnlocked(sections, progress);
  const finalActive = selItem === "final" && selTab === "content";

  return `
    <aside class="w-full lg:w-64 shrink-0">
      <p class="text-xs font-semibold mb-3 tracking-wide" style="color: var(--muted-foreground)">SECTIONS</p>
      ${list}
      <div class="pt-3" style="border-top: 1px solid var(--border)">
        <button data-item="final" ${finalUnlocked ? "" : "disabled"}
          class="js-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${finalUnlocked ? "" : "cursor-not-allowed"}"
          style="background: ${finalActive ? "var(--primary)" : "transparent"};
                 color: ${finalActive ? "#fff" : finalUnlocked ? "var(--foreground)" : "var(--muted-foreground)"};
                 opacity: ${finalUnlocked ? "1" : ".55"}">
          ${icon.trophy}<span class="flex-1 text-left">Final Assessment</span>
          ${finalUnlocked ? "" : `<span>${icon.lock}</span>`}
        </button>
        ${!finalUnlocked ? `<p class="px-3 text-xs italic mt-1" style="color: var(--muted-foreground)">Complete all quizzes to unlock</p>` : ""}
      </div>
    </aside>`;
}

// ─── Panel: Welcome ──────────────────────────────────────────────────────────
function welcomePanel() {
  const sec = sections.find((s) => s.id === selSection);
  const w = items?.welcome || {};
  const vid = w.videoUrl ? (w.videoUrl.match(/([\w-]{11})/)?.[1] || w.videoUrl) : "";

  return `
    <div class="rounded-xl p-6" style="background: var(--card); border: 1px solid var(--border)">
      <h2 class="text-lg font-bold mb-2" style="font-family: var(--font-family-display)">Welcome to ${sec?.title || ""}</h2>
      <p class="text-sm leading-relaxed" style="color: var(--muted-foreground)">${w.message || "No welcome message yet."}</p>
      ${vid ? `
        <div class="relative w-full rounded-lg overflow-hidden mt-4" style="padding-bottom:56.25%">
          <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${vid}"
            frameborder="0" allowfullscreen loading="lazy"></iframe>
        </div>` : ""}
    </div>`;
}

// ─── Panel: Content (renderer automático por tipo) ───────────────────────────
function contentPanel() {
  const sec = sections.find((s) => s.id === selSection);
  return `
    <div>
      <h2 class="text-lg font-bold mb-4" style="font-family: var(--font-family-display)">Content &mdash; ${sec?.title || ""}</h2>
      ${renderContentList(items?.contents || [])}
    </div>`;
}

// ─── Panel: Review (los 3 formatos) ──────────────────────────────────────────
function reviewPanel() {
  const rev = items?.review;
  if (!rev) return emptyBox("No review activity in this section.");

  // ⚠️ Las reviews son PRÁCTICA: se pueden repetir siempre (no son evaluativas)
  let body = "";

  if (rev.format === "fill-blanks") {
    let i = 0;
    const html = (rev.blankText || "").replace(/\[\[(.+?)\]\]/g, () => {
      const idx = i++;
      const ok = feedback?.results?.[idx];
      const border = ok === undefined ? "var(--border)" : ok ? "var(--primary)" : "#dc2626";
      return `<input data-blank="${idx}" value="${answers[idx] || ""}" placeholder="..."
        class="inline-block mx-1 px-2 py-1 rounded text-sm text-center outline-none"
        style="width:100px; background: var(--card); border: 1.5px solid ${border}" />`;
    });
    body = `<p class="text-xs font-semibold mb-3 tracking-wide" style="color: var(--primary)">FILL IN THE BLANKS</p>
            <div class="text-sm leading-loose">${html}</div>`;
  }

  if (rev.format === "match-pairs") {
    const defs = rev.pairs.map((p) => p.def);
    body = `<p class="text-xs font-semibold mb-3 tracking-wide" style="color: var(--primary)">MATCH THE PAIRS</p>` +
      rev.pairs.map((p, idx) => {
        const ok = feedback?.results?.[idx];
        const border = ok === undefined ? "var(--border)" : ok ? "var(--primary)" : "#dc2626";
        return `
          <div class="flex items-center gap-3 mb-2">
            <span class="w-32 text-sm font-medium">${p.term}</span>
            <span style="color: var(--muted-foreground)">&harr;</span>
            <select data-pair="${idx}" class="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style="background: var(--card); border: 1.5px solid ${border}">
              <option value="">Select...</option>
              ${defs.map((d) => `<option ${answers[idx] === d ? "selected" : ""}>${d}</option>`).join("")}
            </select>
          </div>`;
      }).join("");
  }

  if (rev.format === "reorder-steps") {
    const total = rev.steps.length;
    body = `<p class="text-xs font-semibold mb-3 tracking-wide" style="color: var(--primary)">PUT THE STEPS IN ORDER</p>` +
      rev.steps.map((s, idx) => {
        const ok = feedback?.results?.[idx];
        const border = ok === undefined ? "var(--border)" : ok ? "var(--primary)" : "#dc2626";
        return `
          <div class="flex items-center gap-3 mb-2">
            <select data-step="${idx}" class="w-20 px-2 py-2 rounded-lg text-sm outline-none"
              style="background: var(--card); border: 1.5px solid ${border}">
              <option value="">#</option>
              ${Array.from({ length: total }, (_, n) => n + 1)
                .map((n) => `<option ${Number(answers[idx]) === n ? "selected" : ""}>${n}</option>`).join("")}
            </select>
            <span class="flex-1 text-sm">${s.text}</span>
          </div>`;
      }).join("");
  }

  const result = feedback
    ? `<p class="text-sm font-semibold mt-4 text-center" style="color: ${feedback.allCorrect ? "var(--primary)" : "#dc2626"}">
         ${feedback.allCorrect ? "\u2713 All correct! Well done." : `${feedback.correct}/${feedback.total} correct. Try again.`}
       </p>` : "";

  return `
    <div class="rounded-xl p-6" style="background: var(--card); border: 1px solid var(--border)">
      <h2 class="text-lg font-bold mb-1" style="font-family: var(--font-family-display)">Review Activity</h2>
      <p class="text-sm mb-5" style="color: var(--muted-foreground)">Complete the activity below and check your answers for instant feedback.</p>
      <div class="rounded-xl p-5 mb-4" style="background: var(--muted)">${body}</div>
      <button class="js-check-review w-full py-3 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style="background: var(--primary)">${feedback ? "Try again" : "Check answers"}</button>
      ${result}
    </div>`;
}

// ─── Panel: Quizz / Final Assessment ─────────────────────────────────────────
function quizzPanel(isFinal = false) {
  const quiz = isFinal ? finalAssessment : items?.quizz;
  if (!quiz?.questions?.length) return emptyBox("No questions in this quiz.");

  const done = isFinal ? progress.final : progress.quizzes[selSection];

  const questions = quiz.questions.map((q, qi) => {
    const opts = q.options.map((opt, oi) => {
      const picked = answers[q.id] === oi;
      let border = "var(--border)", bg = "var(--muted)";
      if (feedback) {
        // Marca visual tras enviar. `q.correct` solo se usa para PINTAR, nunca
        // para calificar (eso lo hace el service / el backend).
        //
        // FUTURO: el backend NO enviará `correct`. Entonces la respuesta de
        // POST /api/submissions debe incluir `correctAnswers: { [qId]: index }`
        // y aquí se leerá de ahí: const right = feedback.correctAnswers?.[q.id];
        const right = feedback.correctAnswers?.[q.id] ?? q.correct;

        if (oi === right) { border = "var(--primary)"; bg = "var(--secondary)"; }
        else if (picked) { border = "#dc2626"; bg = "#fee2e2"; }
      } else if (picked) { border = "var(--primary)"; bg = "var(--secondary)"; }

      return `
        <label class="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all mb-2"
          style="border: 1.5px solid ${border}; background: ${bg}">
          <input type="radio" name="q-${q.id}" data-q="${q.id}" data-opt="${oi}"
            ${picked ? "checked" : ""} ${feedback ? "disabled" : ""} class="accent-green-600" />
          <span class="text-sm">${opt}</span>
        </label>`;
    }).join("");

    return `
      <div class="rounded-xl p-5 mb-4" style="background: var(--card); border: 1px solid var(--border)">
        <p class="text-sm font-semibold mb-3">${qi + 1}. ${q.text}</p>
        ${opts}
      </div>`;
  }).join("");

  const answered = quiz.questions.every((q) => answers[q.id] !== undefined);

  const result = feedback
    ? `<div class="rounded-xl p-5 text-center mb-4" style="background: var(--secondary)">
         <p class="text-2xl font-bold" style="color: var(--primary); font-family: var(--font-family-display)">${feedback.correct} / ${feedback.total}</p>
         <p class="text-sm mt-1" style="color: var(--primary)">${Math.round((feedback.correct / feedback.total) * 100)}% &middot; +${feedback.points} pts earned</p>
       </div>` : "";

  return `
    <div>
      <h2 class="text-lg font-bold mb-1" style="font-family: var(--font-family-display)">${isFinal ? "Final Assessment" : "Quizzes"}</h2>
      <p class="text-sm mb-5" style="color: var(--muted-foreground)">
        ${isFinal ? "The graded end-of-course test." : "Answer all questions and submit for automatic grading."}
      </p>
      ${result}
      ${questions}
      ${done && !feedback
        ? `<p class="text-sm text-center font-medium" style="color: var(--primary)">\u2713 Already completed (${done.score}/${done.total})</p>`
        : `<button class="js-submit-quizz w-full py-3 rounded-xl text-sm font-semibold transition-all" data-final="${isFinal}"
             style="background: ${answered ? "var(--primary)" : "var(--secondary)"};
                    color: ${answered ? "#fff" : "var(--muted-foreground)"};
                    cursor: ${answered ? "pointer" : "not-allowed"}" ${answered ? "" : "disabled"}>Submit Answers</button>`}
    </div>`;
}

// ─── Panel: Leaderboard ──────────────────────────────────────────────────────
function leaderboardPanel() {
  const me = getSession()?.full_name;
  const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
  const podiumBg = ["#fef3c7", "#f1f5f9", "#fed7aa"];
  const podiumH = [90, 70, 55];

  const podium = leaderboard.slice(0, 3).map((p, i) => `
    <div class="flex-1 text-center">
      <div class="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-xs font-bold mb-1"
           style="background: var(--secondary); color: var(--primary)">
        ${p.name.split(" ").map((n) => n[0]).join("")}
      </div>
      <p class="text-xs font-medium mb-1">${p.name.split(" ")[0]}</p>
      <div class="rounded-t-xl flex items-center justify-center text-2xl"
           style="background: ${podiumBg[i]}; height: ${podiumH[i]}px">${medals[i]}</div>
      <p class="text-xs font-bold mt-1">${p.points.toLocaleString()} pts</p>
    </div>`).join("");

  const rows = leaderboard.map((p, i) => {
    const isMe = p.name === me;
    return `
      <div class="flex items-center gap-3 px-4 py-3 rounded-xl mb-2"
        style="background: var(--card); border: 1.5px solid ${isMe ? "var(--primary)" : "var(--border)"}">
        <span class="text-sm font-bold w-8" style="color: ${i < 3 ? "#f59e0b" : "var(--muted-foreground)"}">#${i + 1}</span>
        <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style="background: var(--secondary); color: var(--primary)">${p.name.split(" ").map((n) => n[0]).join("")}</span>
        <span class="flex-1 text-sm font-medium">${p.name} ${isMe ? `<span style="color: var(--primary)">(you)</span>` : ""}</span>
        <span class="text-sm font-bold">${p.points.toLocaleString()} <span class="font-normal text-xs" style="color: var(--muted-foreground)">pts</span></span>
      </div>`;
  }).join("");

  return `
    <div class="max-w-2xl mx-auto">
      <h2 class="text-xl font-bold mb-6 text-center" style="font-family: var(--font-family-display)">\u{1F3C6} Leaderboard</h2>
      <div class="flex items-end gap-2 mb-8">${podium}</div>
      ${rows}
    </div>`;
}

// ─── Panel: Grades (réplica del diseño de Figma) ────────────────────────────
// Usa calculateFinalGrade(): la MISMA fórmula que ve el tutor en su Dashboard.
function gradesPanel() {
  const { grade, breakdown, completed, totalItems, points, maxPoints } =
    calculateFinalGrade(sections, progress);

  // Tarjeta de resumen (ícono + valor + label + subtexto)
  const summaryCard = (ic, value, label, sub) => `
    <div class="rounded-xl p-5 flex items-start gap-3"
         style="background: var(--card); border: 1px solid var(--border)">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
           style="background: var(--secondary); color: var(--primary)">${ic}</div>
      <div>
        <p class="text-xl font-bold" style="font-family: var(--font-family-display)">${value}</p>
        <p class="text-xs font-medium">${label}</p>
        <p class="text-xs" style="color: var(--muted-foreground)">${sub}</p>
      </div>
    </div>`;

  // Lista de items calificados
  const rows = breakdown.map((b) => {
    let right;

    if (b.status === "graded") {
      right = `
        <div class="shrink-0 text-right">
          <p class="text-sm font-bold">${b.score}<span class="text-xs font-normal" style="color: var(--muted-foreground)"> / ${b.total}</span></p>
          <p class="text-xs font-semibold" style="color: var(--primary)">${b.pct}%</p>
        </div>`;
    } else {
      const locked = b.status === "locked";
      const bg = locked ? "var(--muted)" : "#eff6ff";
      const fg = locked ? "var(--muted-foreground)" : "#2563eb";
      right = `
        <div class="shrink-0 text-right">
          <span class="text-xs font-medium px-2.5 py-1 rounded-full" style="background: ${bg}; color: ${fg}">
            ${locked ? "Locked" : "Not started"}
          </span>
        </div>`;
    }

    const statusText = b.status === "graded" ? "Graded" : b.status === "locked" ? "Locked" : "Pending";

    return `
      <div class="flex items-center gap-4 p-4 rounded-xl mb-2"
           style="background: var(--card); border: 1px solid var(--border)">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">${b.label}</p>
          <p class="text-xs mt-0.5" style="color: var(--muted-foreground)">${statusText}</p>
        </div>
        ${right}
      </div>`;
  }).join("");

  const pending = totalItems - completed;

  return `
    <div class="max-w-3xl mx-auto w-full">
      <h2 class="text-xl font-bold mb-6" style="font-family: var(--font-family-display)">My Grades</h2>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        ${summaryCard(icon.award, `${grade}%`, "Overall Grade", "Based on graded items")}
        ${summaryCard(icon.checkCircle, `${completed} / ${totalItems}`, "Items Graded", `${pending} item${pending !== 1 ? "s" : ""} pending`)}
        ${summaryCard(icon.trophySm, points, "Points Earned", `Out of ${maxPoints} total`)}
      </div>

      <div>${rows}</div>
    </div>`;
}

// ─── Vista completa ──────────────────────────────────────────────────────────
export function courseView() {
  if (!course) return `<div class="p-8 text-sm" style="color: var(--muted-foreground)">Loading...</div>`;

  let body = "";
  if (selTab === "leaderboard") body = leaderboardPanel();
  else if (selTab === "grades") body = gradesPanel();
  else if (selItem === "final") body = quizzPanel(true);
  else if (selItem === "content") body = contentPanel();
  else if (selItem === "review") body = reviewPanel();
  else if (selItem === "quizz") body = quizzPanel(false);
  else body = welcomePanel();

  const tabBtn = (key, label) => {
    const active = selTab === key;
    return `<button data-tab="${key}" class="js-tab px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
      style="background: ${active ? "var(--card)" : "transparent"};
             color: ${active ? "var(--primary)" : "var(--muted-foreground)"};
             box-shadow: ${active ? "0 1px 2px rgba(0,0,0,.06)" : "none"}">${label}</button>`;
  };

  // Banner amarillo: el tutor está viendo como estudiante
  const previewBar = previewMode ? `
    <div class="flex items-center justify-between px-4 sm:px-6 py-2 text-sm"
         style="background:#fef3c7; border-bottom:1px solid #fde68a; color:#92400e">
      <span class="flex items-center gap-2">${icon.eye} You're viewing this as a student</span>
      <button class="js-exit-preview font-semibold hover:underline">Exit preview</button>
    </div>` : "";

  return `
    <div class="min-h-screen" style="background: var(--background); font-family: var(--font-family-body)">
      ${navbar({ active: "home" })}
      ${previewBar}

      <div class="sticky top-16 z-20" style="background: var(--card); border-bottom: 1px solid var(--border)">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <button class="js-back flex items-center gap-1 text-sm shrink-0" style="color: var(--muted-foreground)">${icon.back} Back</button>
            <span style="color: var(--border)">|</span>
            <span class="flex items-center gap-2 text-sm font-semibold truncate">
              <span class="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0" style="background: var(--primary)">${icon.cap}</span>
              ${course.title}
            </span>
          </div>
          <div class="flex items-center gap-1 p-1 rounded-xl shrink-0" style="background: var(--muted)">
            ${tabBtn("content", "Content")}${tabBtn("leaderboard", "Leaderboard")}${tabBtn("grades", "Grades")}
          </div>
        </div>
      </div>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        ${selTab === "content" ? sidebar() : ""}
        <div class="flex-1 min-w-0">
          ${body}
        </div>
      </main>
    </div>`;
}

// Publica la sección actual para el asistente de voz (LumiVoice).
// La barra (voiceAssistantBar.js) lee de aquí qué leer en voz alta.
function syncVoiceContext() {
  const sec = sections.find((s) => s.id === selSection);
  window.__lumivoice = {
    sectionTitle: sec?.title || course?.title || "",
    section: items || {},   // { welcome, contents, review, quizz }
  };
}

function rerender() {
  const app = document.getElementById("app");
  app.innerHTML = courseView();
  attachEvents(app);
}

// ─── Eventos ─────────────────────────────────────────────────────────────────
function attachEvents(root) {
  initNavbar(root);

  // A dónde volver: si el tutor entró desde el editor, regresa al editor
  // con su curso cargado; si entró desde el home, regresa al home.
  const exitPreview = () =>
    navigate(previewFrom === "editor" ? `/tutor/editor?id=${courseId}` : "/tutor");

  root.querySelector(".js-back")?.addEventListener("click", () => {
    closeBar();                 // detiene la voz y cierra la barra LumiVoice
    window.__lumivoice = null;
    if (!previewMode) return navigate("/student");
    exitPreview();
  });

  root.querySelector(".js-exit-preview")?.addEventListener("click", exitPreview);

  root.querySelectorAll(".js-tab").forEach((btn) =>
    btn.addEventListener("click", () => { selTab = btn.dataset.tab; rerender(); })
  );

  // Sidebar
  root.querySelectorAll(".js-item").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (btn.disabled) return;
      if (btn.dataset.item === "final") {
        selItem = "final";
      } else {
        selSection = Number(btn.dataset.sec);
        selItem = btn.dataset.item;
        items = await getSectionItems(courseId, selSection);
      }
      answers = {};
      feedback = null;
      syncVoiceContext();
      rerender();
    })
  );

  // Review: capturar respuestas
  root.querySelectorAll("[data-blank]").forEach((i) =>
    i.addEventListener("input", () => { answers[i.dataset.blank] = i.value; })
  );
  root.querySelectorAll("[data-pair]").forEach((s) =>
    s.addEventListener("change", () => { answers[s.dataset.pair] = s.value; })
  );
  root.querySelectorAll("[data-step]").forEach((s) =>
    s.addEventListener("change", () => { answers[s.dataset.step] = s.value; })
  );

  // Review: comprobar respuestas
  root.querySelector(".js-check-review")?.addEventListener("click", async () => {
    // Si ya había feedback, este clic es "Try again": limpia y vuelve a empezar
    if (feedback) {
      feedback = null;
      answers = {};
      return rerender();
    }

    const rev = items.review;
    let results = [];

    if (rev.format === "fill-blanks") {
      const expected = [...rev.blankText.matchAll(/\[\[(.+?)\]\]/g)].map((m) => m[1]);
      results = expected.map((exp, i) => (answers[i] || "").trim().toLowerCase() === exp.trim().toLowerCase());
    }
    if (rev.format === "match-pairs") results = rev.pairs.map((p, i) => answers[i] === p.def);
    if (rev.format === "reorder-steps") results = rev.steps.map((s, i) => Number(answers[i]) === i + 1);

    const correct = results.filter(Boolean).length;
    const allCorrect = correct === results.length && results.length > 0;
    feedback = { results, correct, total: results.length, allCorrect };

    // Las reviews NO dan puntos al leaderboard: solo se marcan como completadas
    if (allCorrect) progress = await submitReview(courseId, selSection, { correct });
    rerender();
  });

  // Quizz: elegir opción
  root.querySelectorAll("[data-q]").forEach((radio) =>
    radio.addEventListener("change", () => {
      answers[radio.dataset.q] = Number(radio.dataset.opt);
      rerender();
    })
  );

  // Quizz: enviar
  root.querySelector(".js-submit-quizz")?.addEventListener("click", async (e) => {
    const isFinal = e.currentTarget.dataset.final === "true";
    const quiz = isFinal ? finalAssessment : items.quizz;

    // ⚠️ La vista NO califica: solo envía las respuestas al service.
    // Hoy el service corrige localmente; mañana lo hará el SERVIDOR y esta
    // vista no cambiará (ya lee el resultado de la respuesta).
    const { progress: newProgress, result } = isFinal
      ? await submitFinal(courseId, { quiz, answers })
      : await submitQuizz(courseId, selSection, { quiz, answers });

    progress = newProgress;
    feedback = result;      // { correct, total, points } -> lo devuelve el service

    rerender();
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────
export async function initCourseView() {
  const root = document.getElementById("app");
  const params = new URLSearchParams(location.search);

  // Reset del estado del módulo: sin esto se arrastran datos de la visita anterior
  course = null; sections = []; items = null; finalAssessment = null; leaderboard = [];
  progress = { quizzes: {}, reviews: {}, final: null };

  courseId = Number(params.get("id"));
  previewMode = params.get("preview") === "1";   // el tutor mira como estudiante
  previewFrom = params.get("from");              // "editor" si vino del editor

  course = await getCourseById(courseId);

  // Si el curso no existe, volver a donde corresponde SEGÚN EL ROL.
  // (Antes mandaba siempre a /student, y el guard rebotaba al tutor al login.)
  if (!course) {
    const role = getSession()?.role;
    return navigate(role === "tutor" ? "/tutor" : "/student");
  }

  sections = await getSections(courseId);
  progress = await getProgress(courseId);
  leaderboard = await getLeaderboard(courseId);
  finalAssessment = await getFinalAssessment(courseId);

  selSection = sections[0]?.id;
  selItem = "welcome";
  selTab = "content";
  answers = {};
  feedback = null;

  items = await getSectionItems(courseId, selSection);

  syncVoiceContext();

  root.innerHTML = courseView();
  attachEvents(root);
}
