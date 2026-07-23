// ─── Course Card ──────────────────────────────────────────────────────────────
// Reusable course card, replica of the Figma design.
// Two variants:
//   - student: "+Join Course" button (or "Leave" if already enrolled)
//   - tutor:   "Edit" and "Preview" buttons

import { LEVEL_COLORS } from "../constants/ui.js";

const icon = {
  users: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  check: `<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  leave: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  edit: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`,
  eye: `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
};

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

  return `
    <article data-course="${course.id}"
      class="rounded-xl overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 flex flex-col cursor-pointer"
      style="background: var(--card); border: 1px solid var(--border)">

      <!-- Cover -->
      <div class="relative overflow-hidden h-44">
        <img src="${course.image}" alt="${course.title}"
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        <span class="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${levelClass}">${course.level}</span>
        ${enrolledBadge}
      </div>

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
