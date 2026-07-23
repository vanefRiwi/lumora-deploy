// ─── Join Course Modal ────────────────────────────────────────────────────────
// Replica of Figma design. Two ways to join a course:
//
//   1. With CODE  -> for private courses (visibility = "code").
//                     The tutor shares the code; without it, the course doesn't appear.
//   2. By browsing  -> list of open courses (visibility = "open").
//
// RULE 1 of business: private courses are NOT listed here. Only access them
// by entering the correct code.

import { LEVEL_COLORS } from "../constants/ui.js";
import {
  getOpenCourses,
  getEnrolledIds,
  joinCourse,
  joinCourseByCode,
} from "../data/courses.js";

const icon = {
  close: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  check: `<svg class="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
};

/**
 * Opens the modal to join a course.
 * @param {function} onJoined - callback called when enrolling (to refresh the home)
 */
export async function openJoinCourseModal(onJoined) {
  document.querySelector(".js-join-overlay")?.remove();

  // Only OPEN courses (Rule 1: private ones are not listed)
  let openCourses = await getOpenCourses();
  let enrolledIds = await getEnrolledIds();

  const overlay = document.createElement("div");
  overlay.className = "js-join-overlay fixed inset-0 z-[150] flex items-center justify-center p-4";
  overlay.style.cssText = "background: rgba(0,0,0,.5); backdrop-filter: blur(4px); opacity: 0; transition: opacity .2s ease;";

  // Row of an open course
  const courseRow = (c) => {
    const joined = enrolledIds.includes(c.id);
    return `
      <div class="flex items-center gap-3 p-3 rounded-xl transition-all"
           style="border: 1px solid var(--border)">
        <div class="w-14 h-14 rounded-lg overflow-hidden shrink-0" style="background: var(--muted)">
          <img src="${c.image}" alt="${c.title}" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold truncate" style="font-family: var(--font-family-display)">${c.title}</p>
          <p class="text-xs" style="color: var(--muted-foreground)">${c.instructor || ""}</p>
          <span class="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${LEVEL_COLORS[c.level] || ""}">${c.level}</span>
        </div>
        <button data-join-id="${c.id}" ${joined ? "disabled" : ""}
          class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${joined ? "" : "cursor-pointer"}"
          style="${joined
        ? "background: var(--secondary); color: var(--primary); border: 1px solid var(--border)"
        : "background: var(--primary); color: #fff"}">
          ${joined ? `Joined ${icon.check}` : "Join"}
        </button>
      </div>`;
  };

  const listHtml = () =>
    openCourses.length
      ? openCourses.map(courseRow).join("")
      : `<p class="text-sm py-6 text-center" style="color: var(--muted-foreground)">No open courses available.</p>`;

  overlay.innerHTML = `
    <div class="js-join-box w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
         style="background: var(--card); border: 1px solid var(--border);
                transform: scale(.96); transition: transform .2s ease;
                font-family: var(--font-family-body)">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4" style="border-bottom: 1px solid var(--border)">
        <h2 class="text-lg font-bold" style="font-family: var(--font-family-display)">Join a course</h2>
        <button class="js-join-close p-1.5 rounded-lg cursor-pointer transition-colors"
                style="color: var(--muted-foreground)">${icon.close}</button>
      </div>

      <div class="px-6 py-5 overflow-y-auto" style="max-height: 70vh">

        <!-- Code field (private courses) -->
        <label class="block text-sm font-medium mb-1.5">Course code</label>
        <div class="flex gap-2 mb-2">
          <input class="js-code flex-1 px-4 py-2.5 rounded-xl text-sm font-mono tracking-widest uppercase outline-none"
                 style="background: var(--muted); border: 1px solid var(--border)"
                 placeholder="e.g. EDU-A3K9" maxlength="8" />
          <button class="js-join-code px-5 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 cursor-pointer"
                  style="background: var(--primary)">Join</button>
        </div>
        <p class="js-code-msg text-xs mb-5" style="color: var(--muted-foreground)">
          Your tutor shares this code for private courses.
        </p>

        <!-- Divider -->
        <div class="flex items-center gap-3 mb-5">
          <div class="flex-1 h-px" style="background: var(--border)"></div>
          <span class="text-xs font-medium" style="color: var(--muted-foreground)">or browse open courses</span>
          <div class="flex-1 h-px" style="background: var(--border)"></div>
        </div>

        <!-- List of open courses -->
        <div class="js-open-list space-y-3">${listHtml()}</div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    overlay.querySelector(".js-join-box").style.transform = "scale(1)";
  });

  const close = () => {
    overlay.style.opacity = "0";
    overlay.querySelector(".js-join-box").style.transform = "scale(.96)";
    document.removeEventListener("keydown", onKey);
    setTimeout(() => overlay.remove(), 180);
  };

  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);

  // Refreshes the list after enrolling (without closing the modal)
  const refreshList = async () => {
    enrolledIds = await getEnrolledIds();
    openCourses = await getOpenCourses();
    overlay.querySelector(".js-open-list").innerHTML = listHtml();
    bindJoinButtons();
    onJoined?.();
  };

  // "Join" buttons from the list
  function bindJoinButtons() {
    overlay.querySelectorAll("[data-join-id]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;
        await joinCourse(Number(btn.dataset.joinId));   // open course: no code
        await refreshList();
      })
    );
  }
  bindJoinButtons();

  // ── Join with CODE (private courses) ──
  const codeInput = overlay.querySelector(".js-code");
  const codeMsg = overlay.querySelector(".js-code-msg");

  const showMsg = (text, ok = false) => {
    codeMsg.textContent = text;
    codeMsg.style.color = ok ? "var(--primary)" : "#dc2626";
  };

  // Forces uppercase when typing
  codeInput.addEventListener("input", () => {
    codeInput.value = codeInput.value.toUpperCase();
  });

  const submitCode = async () => {
    const code = codeInput.value.trim();
    if (!code) return showMsg("Enter a course code.");

    try {
      const course = await joinCourseByCode(code);
      showMsg(`\u2713 Joined "${course.title}"`, true);
      codeInput.value = "";
      await refreshList();
      setTimeout(close, 1200);
    } catch (err) {
      showMsg(err.message);
    }
  };

  overlay.querySelector(".js-join-code").addEventListener("click", submitCode);
  codeInput.addEventListener("keydown", (e) => { if (e.key === "Enter") submitCode(); });

  // Close
  overlay.querySelector(".js-join-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  codeInput.focus();
}
