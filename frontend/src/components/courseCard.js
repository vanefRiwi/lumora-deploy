// ─── Course Card ──────────────────────────────────────────────────────────────
// Reusable course card, replica of the Figma design.
// Two variants:
//   - student: "+Join Course" button (or "Leave" if already enrolled)
//   - tutor:   "Edit" and "Preview" buttons
//
// Students also get an "i" button on the top-right corner: it reveals the
// course description in a translucent tooltip, on hover (desktop) or on
// tap (touch devices, handled by bindInfoTooltips below).

import { LEVEL_COLORS } from "../constants/ui.js";

const icon = {
  users: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  check: `<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  leave: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  edit: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`,
  eye: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  info: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

// The description is free text written by the tutor, so it is escaped before
// being injected into the template.
function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function courseCard(course, { role = "student", isJoined = false } = {}) {
  const levelClass = LEVEL_COLORS[course.level] || "";

  // Actions based on role
  const actions = role === "tutor"
    ? `
      <div class="mt-auto grid grid-cols-2 gap-2">
        <button data-edit="${course.id}"
          class="flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-lg text-white transition-colors"
          style="background: var(--primary)">${icon.edit} Edit</button>
        <button data-preview="${course.id}"
          class="flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-lg transition-colors"
          style="background: var(--muted); color: var(--muted-foreground); border: 1px solid var(--border)">${icon.eye} Preview</button>
      </div>`
    : isJoined
      ? `
      <div class="mt-auto flex justify-end">
        <button data-leave="${course.id}"
          class="flex items-center gap-1 text-xs transition-colors hover:text-red-600"
          style="color: var(--muted-foreground)">${icon.leave} Leave</button>
      </div>`
      : `
      <button data-join="${course.id}"
        class="mt-auto w-full text-xs font-semibold py-2 rounded-lg transition-all text-white"
        style="background: var(--primary)">+ Join Course</button>`;

  // Badge "Enrolled" (only for student and enrolled)
  const enrolledBadge = (role === "student" && isJoined)
    ? `<span class="absolute bottom-3 right-3 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
             style="background: var(--primary)">${icon.check} Enrolled</span>`
    : "";

  // ── Info button + description tooltip (student only) ──
  // Hover is handled by CSS (named group). Touch is handled by JS, because
  // there is no hover on mobile and iOS Safari never focuses a <button> on
  // tap, so :focus-within would never fire there.
  const description = esc(course.description || "").trim();
  const infoTooltip = role === "student"
    ? `
      <div class="js-info group/info absolute top-3 right-3 z-20">
        <button type="button" data-info="${course.id}"
          aria-label="Course description"
          class="flex items-center justify-center w-7 h-7 rounded-full text-white backdrop-blur-sm
                 transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2"
          style="background: rgba(15, 31, 15, 0.45); box-shadow: 0 1px 3px rgba(0,0,0,.25)">
          ${icon.info}
        </button>

        <div role="tooltip"
          class="js-tip pointer-events-none absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-3rem)]
                 p-3 rounded-xl text-xs leading-relaxed text-left
                 opacity-0 invisible translate-y-1
                 transition-all duration-200 ease-out
                 group-hover/info:opacity-100 group-hover/info:visible group-hover/info:translate-y-0"
          style="background: color-mix(in srgb, var(--card) 82%, transparent);
                 backdrop-filter: blur(10px);
                 -webkit-backdrop-filter: blur(10px);
                 border: 1px solid var(--border);
                 color: var(--foreground);
                 box-shadow: 0 8px 24px rgba(15, 31, 15, 0.12)">
          <span class="block text-[10px] font-semibold uppercase tracking-wide mb-1"
                style="color: var(--primary)">About this course</span>
          ${description
            ? `<span class="block">${description}</span>`
            : `<span class="block italic" style="color: var(--muted-foreground)">No description available yet.</span>`}
        </div>
      </div>`
    : "";

  return `
    <article data-course="${course.id}"
      class="relative rounded-xl group hover:z-20 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex flex-col cursor-pointer"
      style="background: var(--card); border: 1px solid var(--border)">

      <!-- Cover (keeps its own overflow-hidden so the tooltip is never clipped) -->
      <div class="relative overflow-hidden rounded-t-xl h-44">
        <img src="${course.image}" alt="${course.title}"
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        <span class="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${levelClass}">${course.level}</span>
        ${enrolledBadge}
      </div>

      ${infoTooltip}

      <!-- Info -->
      <div class="p-4 flex flex-col flex-1">
        <h3 class="font-semibold text-sm leading-snug mb-1 transition-colors"
            style="font-family: var(--font-family-display)">${course.title}</h3>
        <p class="text-xs mb-3" style="color: var(--muted-foreground)">${course.instructor}</p>
        <div class="flex items-center gap-1 text-xs mb-3" style="color: var(--muted-foreground)">
          ${icon.users} ${course.students.toLocaleString()}
        </div>
        ${actions}
      </div>
    </article>
  `;
}

// ─── Info tooltip: touch support ─────────────────────────────────────────────
// On desktop the CSS group-hover is enough. On touch there is no hover, and
// iOS Safari does not give focus to a <button> on tap, so the tap toggles the
// tooltip styles directly.

function closeAllInfo() {
  document.querySelectorAll(".js-info .js-tip").forEach((tip) => {
    tip.style.opacity = "";
    tip.style.visibility = "";
    tip.style.transform = "";
  });
}

// Registered once for the whole app: tapping anywhere else closes the tooltip.
if (!window.__lumoraInfoOutsideBound) {
  window.__lumoraInfoOutsideBound = true;
  document.addEventListener("click", closeAllInfo);
}

// Must be called after every render that produces course cards.
export function bindInfoTooltips(root = document) {
  root.querySelectorAll(".js-info").forEach((wrapper) => {
    const btn = wrapper.querySelector("[data-info]");
    const tip = wrapper.querySelector(".js-tip");
    if (!btn || !tip) return;

    // bindCardActions runs on mount AND on every grid refresh, so without
    // this guard the listeners would stack up and cancel each other out.
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", (e) => {
      // Must not reach the card underneath (it would open the course).
      e.stopPropagation();
      e.preventDefault();

      const wasOpen = tip.style.visibility === "visible";
      closeAllInfo();
      if (!wasOpen) {
        tip.style.opacity = "1";
        tip.style.visibility = "visible";
        tip.style.transform = "translateY(0)";
      }
    });
  });
}
