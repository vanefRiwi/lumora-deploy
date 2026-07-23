// ─── Student Home ─────────────────────────────────────────────────────────────
// Welcome banner + stats + course catalog with search.
// Data comes from data/courses.js (today mock, tomorrow the real API).

import { navbar, initNavbar } from "../../components/navbar.js";
import { courseCard } from "../../components/courseCard.js";
import { getSession } from "../../helpers/auth.js";
import { navigate } from "../../router/router.js";
import { confirmModal } from "../../components/confirmModal.js";
import { openJoinCourseModal } from "../../components/joinCourseModal.js";
import {
  getCourses,
  getEnrolledIds,
  joinCourse,
  leaveCourse,
} from "../../data/courses.js";

const icon = {
  book: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  trend: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  search: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  searchBig: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  plus: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>`,
  bookBig: `<svg class="w-40 h-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
};

// View state
let allCourses = [];
let enrolledIds = [];
let search = "";

// Gamification level based on number of courses
function getLevel(count) {
  if (count >= 5) return "Expert";
  if (count >= 1) return "Apprentice";
  return "Rookie";
}

// Stat card
function statCard(iconSvg, value, label) {
  return `
    <div class="rounded-xl p-5 flex items-start gap-4" style="background: var(--card); border: 1px solid var(--border)">
      <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
           style="background: var(--secondary); color: var(--primary)">${iconSvg}</div>
      <div>
        <p class="text-2xl font-bold" style="font-family: var(--font-family-display)">${value}</p>
        <p class="text-sm font-medium">${label}</p>
      </div>
    </div>`;
}

// Courses grid (re-renders on search or enrollment)
function coursesGrid() {
  const term = search.toLowerCase();
  const filtered = allCourses.filter(
    (c) => c.title.toLowerCase().includes(term) || c.category.toLowerCase().includes(term)
  );

  if (!filtered.length) {
    return `<p class="text-sm py-8 text-center" style="color: var(--muted-foreground)">No courses found.</p>`;
  }

  return filtered
    .map((c) => courseCard(c, { role: "student", isJoined: enrolledIds.includes(c.id) }))
    .join("");
}

export function studentHomeView() {
  const user = getSession() || { full_name: "Student" };
  const firstName = user.full_name.split(" ")[0];
  const count = enrolledIds.length;
  const term = search.toLowerCase();
  const visible = allCourses.filter(
    (c) => c.title.toLowerCase().includes(term) || c.category.toLowerCase().includes(term)
  ).length;

  return `
    <div class="min-h-screen" style="background: var(--background); font-family: var(--font-family-body)">
      ${navbar({ active: "home" })}

      <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <!-- Welcome banner -->
        <div class="relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8"
             style="background: linear-gradient(to bottom right, var(--primary), #15803d)">
          <div class="relative z-10">
            <p class="text-green-200 text-sm font-medium mb-1">Welcome back,</p>
            <h1 class="text-white text-3xl font-bold mb-2" style="font-family: var(--font-family-display)">
              Ready to learn, ${firstName}? 🎓
            </h1>
            <p class="text-green-100 max-w-md">
              You are enrolled in <strong>${count} course${count !== 1 ? "s" : ""}</strong>. Explore new topics and keep growing!
            </p>
          </div>
          <div class="absolute right-8 top-0 bottom-0 flex items-center opacity-10 text-white">${icon.bookBig}</div>
          <div class="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/5"></div>
          <div class="absolute -right-4 -top-8 w-32 h-32 rounded-full bg-white/5"></div>
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          ${statCard(icon.book, count, "Enrolled courses")}
          ${statCard(icon.trend, getLevel(count), "Level")}
          ${statCard(icon.searchBig, allCourses.length, "Available courses")}
        </div>

        <!-- Catalog header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 class="text-xl font-bold" style="font-family: var(--font-family-display)">Available Courses</h2>
            <p class="text-sm mt-0.5 js-count" style="color: var(--muted-foreground)">${visible} courses to explore</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="relative flex-1 sm:flex-none">
              <span class="absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--muted-foreground)">${icon.search}</span>
              <input type="text" placeholder="Search courses..." value="${search}"
                class="js-search pl-9 pr-4 py-2 text-sm rounded-lg outline-none w-full sm:w-52"
                style="background: var(--muted); border: 1px solid var(--border)" />
            </div>
            <button class="js-join-modal flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
                    style="background: var(--primary)">${icon.plus} Join Courses</button>
          </div>
        </div>

        <!-- Courses grid -->
        <div class="js-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          ${coursesGrid()}
        </div>
      </main>
    </div>
  `;
}

// Re-renders only the grid and counter (without reloading the entire view)
function refreshGrid(root) {
  root.querySelector(".js-grid").innerHTML = coursesGrid();
  const term = search.toLowerCase();
  const visible = allCourses.filter(
    (c) => c.title.toLowerCase().includes(term) || c.category.toLowerCase().includes(term)
  ).length;
  root.querySelector(".js-count").textContent = `${visible} courses to explore`;
  bindCardActions(root);
}

// Hooks the Join / Leave buttons for each card
function bindCardActions(root) {
  // Click on card -> open course (only if already enrolled)
  root.querySelectorAll("[data-course]").forEach((card) =>
    card.addEventListener("click", () => {
      const id = Number(card.dataset.course);
      if (enrolledIds.includes(id)) navigate(`/student/course?id=${id}`);
    })
  );

  root.querySelectorAll("[data-join]").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      enrolledIds = await joinCourse(Number(btn.dataset.join));
      rerender();
    })
  );
  root.querySelectorAll("[data-leave]").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.leave);
      const course = allCourses.find((c) => c.id === id);

      // Confirmation before leaving course
      const ok = await confirmModal({
        title: "Leave this course?",
        message: `You'll be unenrolled from "${course?.title || "this course"}". Your progress will be lost and you'll need to join again to continue.`,
        confirmText: "Leave course",
        danger: true,
      });
      if (!ok) return;

      enrolledIds = await leaveCourse(id);

      // ⚠️ Must RELOAD the catalog, not just repaint:
      // if the course was PRIVATE, leaving makes it invisible and should
      // disappear from home (getCourses only returns "open" + private ones
      // you're still enrolled in).
      allCourses = await getCourses();

      rerender();
    })
  );
}

// Re-renders entire view (to update banner and stats too)
function rerender() {
  const app = document.getElementById("app");
  app.innerHTML = studentHomeView();
  attachEvents(app);
}

// View events (without reloading data)
function attachEvents(root) {
  initNavbar(root);

  // Live search
  const input = root.querySelector(".js-search");
  input.addEventListener("input", (e) => {
    search = e.target.value;
    refreshGrid(root);
  });

  // Modal "Join a course": by code (private) or exploring open ones
  root.querySelector(".js-join-modal").addEventListener("click", () => {
    openJoinCourseModal(async () => {
      // When enrolling, reload data and re-render home
      allCourses = await getCourses();
      enrolledIds = await getEnrolledIds();
      rerender();
    });
  });

  bindCardActions(root);
}

export async function initStudentHome() {
  const root = document.getElementById("app");

  // Loads data (today mock, tomorrow the real API) and re-renders
  allCourses = await getCourses();
  enrolledIds = await getEnrolledIds();
  search = "";

  root.innerHTML = studentHomeView();
  attachEvents(root);
}
