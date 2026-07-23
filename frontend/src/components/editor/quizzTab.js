// ─── Tab: Quizz / Final Assessment ────────────────────────────────────────
// Multiple choice questions with radio to mark the correct answer.
// The same component works for section quizz and final exam.

const icon = {
  close: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  plus: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>`,
};

function toggle(name, label, on) {
  return `
    <div class="flex items-center justify-between py-3">
      <p class="text-sm font-medium">${label}</p>
      <button type="button" data-toggle="${name}"
        class="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style="background: ${on ? "var(--primary)" : "#cbd5e1"}">
        <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all"
              style="left: ${on ? "1.375rem" : "0.125rem"}"></span>
      </button>
    </div>`;
}

// A question with its 4 options
function question(q, index) {
  const options = q.options
    .map((opt, i) => {
      const correct = q.correct === i;
      return `
        <label class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
          style="border: 1px solid ${correct ? "var(--primary)" : "var(--border)"};
                 background: ${correct ? "var(--secondary)" : "var(--muted)"}">
          <input type="radio" name="correct-${q.id}" data-correct="${q.id}" data-opt="${i}"
                 ${correct ? "checked" : ""} class="accent-green-600" />
          <input type="text" data-opt-text="${q.id}-${i}" value="${opt}"
                 class="flex-1 bg-transparent text-sm outline-none" />
        </label>`;
    })
    .join("");

  return `
    <div class="rounded-xl p-4 mb-3" style="background: var(--card); border: 1px solid var(--border)">
      <div class="flex items-start gap-2 mb-3">
        <span class="text-xs font-bold mt-2.5 shrink-0" style="color: var(--muted-foreground)">Q${index + 1}</span>
        <input type="text" data-q-text="${q.id}" value="${q.text || ""}"
          placeholder="Write the question..."
          class="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style="background: var(--muted); border: 1px solid var(--border)" />
        <button data-remove-q="${q.id}" class="mt-2 shrink-0 hover:text-red-600"
                style="color: var(--muted-foreground)">${icon.close}</button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${options}</div>
      <p class="text-xs mt-2" style="color: var(--muted-foreground)">Select the correct answer with the radio button.</p>
    </div>`;
}

// isFinal = true → texts and grading for final exam
export function quizzTab(quiz = {}, { isFinal = false } = {}) {
  const questions = (quiz.questions || []).map(question).join("");

  return `
    <div>
      <p class="text-sm mb-4" style="color: var(--muted-foreground)">
        ${isFinal
      ? "The final assessment is the graded end-of-course test. Add questions below."
      : "Add multiple-choice questions. Students submit for automatic grading."}
      </p>

      <div class="js-questions">${questions}</div>

      <button class="js-add-question w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors mb-5"
              style="border: 1px dashed var(--border); color: var(--muted-foreground)">
        ${icon.plus} Add question
      </button>

      <div>
        <p class="text-xs font-semibold mb-1 tracking-wide" style="color: var(--muted-foreground)">GRADING</p>
        ${toggle("quizCounts", "Counts toward grade", quiz.countsGrade !== false)}
        <div class="mt-2">
          <label class="block text-sm font-medium mb-1.5">
            ${isFinal ? "Leaderboard points" : "Leaderboard points per question"}
          </label>
          <input type="number" name="quizPoints" value="${quiz.points ?? (isFinal ? 200 : 50)}" min="0"
            class="w-28 px-3 py-2 rounded-lg text-sm outline-none"
            style="background: var(--muted); border: 1px solid var(--border)" />
        </div>
      </div>
    </div>
  `;
}
