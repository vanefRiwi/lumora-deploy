// ─── Tutor Home ───────────────────────────────────────────────────────────────
// Welcome banner + stats + course management (Edit / Preview).
// Data comes from data/courses.js (today mock, tomorrow the real API).

import { navbar, initNavbar } from "../../components/navbar.js";
import { courseCard } from "../../components/courseCard.js";
import { getSession } from "../../helpers/auth.js";
import { navigate } from "../../router/router.js";
import { getTutorCourses, getTutorStats } from "../../data/courses.js";

const icon = {
  book: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  users: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  layout: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  search: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  plus: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>`,
  capBig: `<svg class="w-40 h-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
};

// View state
let allCourses = [];
let stats = { totalCourses: 0, totalStudents: 0, totalSections: 0, sectionsPerCourse: 0 };
let search = "";

// Stat card (with extra detail line)
function statCard(iconSvg, value, label, detail) {
  return `
    <div class="rounded-xl p-5 flex items-start gap-4" style="background: var(--card); border: 1px solid var(--border)">
      <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
           style="background: var(--secondary); color: var(--primary)">${iconSvg}</div>
      <div>
        <p class="text-2xl font-bold" style="font-family: var(--font-family-display)">${value}</p>
        <p class="text-sm font-medium">${label}</p>
        <p class="text-xs mt-0.5" style="color: var(--muted-foreground)">${detail}</p>
      </div>
    </div>`;
}

// Courses filtered by search
function filteredCourses() {
  const term = search.toLowerCase();
  return allCourses.filter(
    (c) => c.title.toLowerCase().includes(term) || c.category.toLowerCase().includes(term)
  );
}

function coursesGrid() {
  const filtered = filteredCourses();
  if (!filtered.length) {
    return `<p class="text-sm py-8 text-center" style="color: var(--muted-foreground)">No courses found.</p>`;
  }
  return filtered.map((c) => courseCard(c, { role: "tutor" })).join("");
}

export function tutorHomeView() {
  const user = getSession() || { full_name: "Tutor" };
  const firstName = user.full_name.split(" ")[0];

  return `
    <div class="min-h-screen" style="background: var(--background); font-family: var(--font-family-body)">
      ${navbar({ active: "home" })}

      <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <!-- Welcome banner -->
        <div class="relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8" style="background: var(--primary)">
          <div class="relative z-10">
            <p class="text-green-200 text-sm font-medium mb-1">Good morning,</p>
            <h1 class="text-white text-3xl font-bold mb-2" style="font-family: var(--font-family-display)">
              Welcome back, ${firstName} 👋
            </h1>
            <p class="text-green-100 max-w-md">
              You have <strong>${stats.totalCourses} active courses</strong> and
              <strong>${stats.totalStudents.toLocaleString()} enrolled students</strong>. Keep up the great work!
            </p>
          </div>
          <div class="absolute right-8 top-0 bottom-0 flex items-center opacity-10 text-white">${icon.capBig}</div>
          <div class="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/5"></div>
          <div class="absolute -right-4 -top-8 w-32 h-32 rounded-full bg-white/5"></div>
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          ${statCard(icon.book, stats.totalCourses, "Total courses", `${stats.totalCourses} active`)}
          ${statCard(icon.users, stats.totalStudents.toLocaleString(), "Total students", "Across all courses")}
          ${statCard(icon.layout, stats.totalSections, "Sections created", `${stats.sectionsPerCourse} per course`)}
        </div>

        <!-- Courses header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 class="text-xl font-bold" style="font-family: var(--font-family-display)">All Courses</h2>
            <p class="text-sm mt-0.5 js-count" style="color: var(--muted-foreground)">${filteredCourses().length} courses available</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="relative flex-1 sm:flex-none">
              <span class="absolute left-3 top-1/2 -translate-y-1/2" style="color: var(--muted-foreground)">${icon.search}</span>
              <input type="text" placeholder="Search courses..." value="${search}"
                class="js-search pl-9 pr-4 py-2 text-sm rounded-lg outline-none w-full sm:w-52"
                style="background: var(--muted); border: 1px solid var(--border)" />
            </div>
            <button class="js-add flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
                    style="background: var(--primary)">${icon.plus} Add</button>
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

// Hooks the Edit / Preview buttons for each card
function bindCardActions(root) {
  root.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Rule 3: only reaches here if the course is theirs (getTutorCourses already filtered)
      navigate(`/tutor/editor?id=${btn.dataset.edit}`);
    })
  );
  // "Preview": view the course as a student would see it
  root.querySelectorAll("[data-preview]").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigate(`/student/course?id=${btn.dataset.preview}&preview=1`);
    })
  );
}

function attachEvents(root) {
  initNavbar(root);

  // Live search (only re-renders the grid)
  root.querySelector(".js-search").addEventListener("input", (e) => {
    search = e.target.value;
    root.querySelector(".js-grid").innerHTML = coursesGrid();
    root.querySelector(".js-count").textContent = `${filteredCourses().length} courses available`;
    bindCardActions(root);
  });

  // "Add" button (create new course)
  root.querySelector(".js-add").addEventListener("click", () => {
    navigate("/tutor/editor");   // Rule 2: only tutors (role-protected route)
  });

  bindCardActions(root);
}

export async function initTutorHome() {
  const root = document.getElementById("app");

  // Loads data (today mock, tomorrow the real API)
  // Rule 3: only courses created by this tutor
  allCourses = await getTutorCourses();
  stats = await getTutorStats();
  search = "";

  root.innerHTML = tutorHomeView();
  attachEvents(root);
}
