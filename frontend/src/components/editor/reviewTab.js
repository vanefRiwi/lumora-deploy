// ─── Tab: Review ───────────────────────────────────────────────────────────────
// Review activity with 3 formats: Fill in the blanks, Match pairs, Reorder steps.
//
// ⚠️ Reviews are NOT evaluative:
//   - They don't count toward the final grade.
//   - They don't award leaderboard points.
//   - Students can repeat them as many times as they want.
// That's why there are NO options for "counts toward grade" or points.
// Those options only exist in Quizz and Final Assessment.

const icon = {
  close: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
};

// Switch-type toggle (only for "Instant feedback")
function toggle(name, label, sub, on) {
  return `
    <div class="flex items-center justify-between py-3">
      <div>
        <p class="text-sm font-medium">${label}</p>
        ${sub ? `<p class="text-xs" style="color: var(--muted-foreground)">${sub}</p>` : ""}
      </div>
      <button type="button" data-toggle="${name}"
        class="relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer"
        style="background: ${on ? "var(--primary)" : "#cbd5e1"}">
        <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all"
              style="left: ${on ? "1.375rem" : "0.125rem"}"></span>
      </button>
    </div>`;
}

// ── Format 1: Fill in the blanks ──
function fillBlanks(rev) {
  return `
    <div>
      <label class="block text-sm font-medium mb-1">Activity text</label>
      <p class="text-xs mb-1.5" style="color: var(--muted-foreground)">
        Wrap each answer in <code>[[double brackets]]</code> — those become the blanks.
      </p>
      <textarea rows="4" name="blankText"
        class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none font-mono"
        style="background: var(--muted); border: 1px solid var(--border)"
        placeholder="The [[primary]] color model used in web design is [[RGB]].">${rev.blankText || ""}</textarea>
    </div>`;
}

// ── Format 2: Match pairs ──
function matchPairs(rev) {
  const rows = (rev.pairs || [])
    .map((p, i) => `
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs w-4 shrink-0" style="color: var(--muted-foreground)">${i + 1}</span>
        <input type="text" data-pair-term="${p.id}" value="${p.term || ""}" placeholder="Term"
          class="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style="background: var(--muted); border: 1px solid var(--border)" />
        <span style="color: var(--muted-foreground)">&harr;</span>
        <input type="text" data-pair-def="${p.id}" value="${p.def || ""}" placeholder="Definition"
          class="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style="background: var(--muted); border: 1px solid var(--border)" />
        <button data-remove-pair="${p.id}" class="shrink-0 hover:text-red-600 cursor-pointer"
                style="color: var(--muted-foreground)">${icon.close}</button>
      </div>`)
    .join("");

  return `
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium">Term / Definition pairs</label>
        <button class="js-add-pair text-xs font-semibold cursor-pointer" style="color: var(--primary)">+ Add pair</button>
      </div>
      <div class="js-pairs">${rows}</div>
    </div>`;
}

// ── Format 3: Reorder steps ──
function reorderSteps(rev) {
  const rows = (rev.steps || [])
    .map((s, i) => `
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs w-4 shrink-0" style="color: var(--muted-foreground)">${i + 1}</span>
        <input type="text" data-step="${s.id}" value="${s.text || ""}" placeholder="Step description"
          class="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style="background: var(--muted); border: 1px solid var(--border)" />
        <button data-remove-step="${s.id}" class="shrink-0 hover:text-red-600 cursor-pointer"
                style="color: var(--muted-foreground)">${icon.close}</button>
      </div>`)
    .join("");

  return `
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium">Steps (correct order)</label>
        <button class="js-add-step text-xs font-semibold cursor-pointer" style="color: var(--primary)">+ Add step</button>
      </div>
      <div class="js-steps">${rows}</div>
    </div>`;
}

export function reviewTab(rev = {}) {
  const fmt = rev.format || "fill-blanks";

  const fmtBtn = (value, label) => {
    const active = fmt === value;
    return `<button type="button" data-format="${value}"
      class="py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
      style="border: 2px solid ${active ? "var(--primary)" : "var(--border)"};
             background: ${active ? "var(--secondary)" : "var(--muted)"};
             color: ${active ? "var(--primary)" : "var(--muted-foreground)"}">${label}</button>`;
  };

  const body =
    fmt === "match-pairs" ? matchPairs(rev)
      : fmt === "reorder-steps" ? reorderSteps(rev)
        : fillBlanks(rev);

  return `
    <div class="space-y-5">
      <p class="text-sm" style="color: var(--muted-foreground)">
        Students complete this activity inside the platform and receive instant feedback.
      </p>

      <!-- Note: reviews are practice, NOT graded -->
      <div class="flex items-start gap-2.5 p-3 rounded-xl text-xs"
           style="background: var(--secondary); color: var(--primary)">
        <span class="shrink-0">&#8505;</span>
        <span>This is a <strong>practice activity</strong>. It doesn't count toward the grade,
        awards no leaderboard points, and students can retry it as many times as they want.</span>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Activity format</label>
        <div class="grid grid-cols-3 gap-2">
          ${fmtBtn("fill-blanks", "Fill in the blanks")}
          ${fmtBtn("match-pairs", "Match pairs")}
          ${fmtBtn("reorder-steps", "Reorder steps")}
        </div>
      </div>

      <div class="js-review-body">${body}</div>

      ${toggle("instantFeedback", "Instant feedback", "Show correct / incorrect immediately after checking.", rev.instantFeedback !== false)}
    </div>
  `;
}
