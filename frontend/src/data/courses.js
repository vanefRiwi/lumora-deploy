// ─── Data layer: Courses ──────────────────────────────────────────────────────
// Only data source for the views. All functions now talk to the REAL backend
// (Express + PostgreSQL on Neon). localStorage is no longer used for courses or
// enrollments: everything persists in the database.
//
// ─── LUMORA BUSINESS RULES (enforced SERVER-SIDE, mirrored here for UI) ──────
// 1. Students only see courses with visibility = "open" (private "code" courses
//    only appear once they are enrolled). The backend already filters this.
// 2. Students CANNOT create courses; only tutors can (canCreateCourse guard).
// 3. Tutors only see and edit courses where course.tutor_id === their id
//    (the backend validates ownership on every write).

import { getSession } from "../helpers/auth.js";
import { api } from "../helpers/api.js";

// Color classes based on course level
export const LEVEL_COLORS = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-green-100 text-green-700",
  Advanced: "bg-teal-100 text-teal-700",
};

// ─── Business rule guards (UI only; the server re-validates) ──────────────────

// Rule 2: only tutors can create courses.
export function canCreateCourse() {
  return getSession()?.role === "tutor";
}

// Rule 3: a tutor can only edit THEIR OWN courses.
export function canEditCourse(course) {
  const user = getSession();
  return user?.role === "tutor" && course.tutor_id === user.id;
}

// ─── Data API (what the views consume) ─────────────────────────────────────────

// GET /api/courses — the backend applies Rule 1 per role and returns the real
// `students` count computed from the enrollments table.
export async function getCourses() {
  return api.get("/courses");
}

// GET /api/courses/mine — Rule 3: only the authenticated tutor's courses.
export async function getTutorCourses() {
  if (getSession()?.role !== "tutor") return [];
  return api.get("/courses/mine");
}

// GET /api/enrollments/mine — IDs of courses the student is enrolled in.
// (Tutors have no enrollments; return [] without hitting a student-only route.)
export async function getEnrolledIds() {
  if (getSession()?.role !== "student") return [];
  try {
    return await api.get("/enrollments/mine");
  } catch {
    return [];
  }
}

// RULE 2 — Join an OPEN course. The enrollment row is created in PostgreSQL.
// Returns the refreshed list of enrolled ids (same contract the views expect).
export async function joinCourse(id) {
  await api.post("/enrollments", { course_id: id });
  return getEnrolledIds();
}

// Leave a course. The backend deletes the enrollment AND the submissions of
// that course, so re-joining starts from zero.
export async function leaveCourse(id) {
  await api.del(`/enrollments/${id}`);
  return getEnrolledIds();
}

// RULE 1 — Join a PRIVATE course using its code. The backend validates the
// code and creates the enrollment; returns the joined course.
export async function joinCourseByCode(code) {
  const { course } = await api.post("/enrollments/by-code", { code });
  return course;
}

// Tutor statistics (only for THEIR courses — Rule 3), computed server-side.
export async function getTutorStats() {
  return api.get("/courses/stats");
}

// RULE 1 — OPEN courses available to explore in the "Join a course" modal.
// Private ones (visibility="code") are never listed: only accessed with code.
export async function getOpenCourses() {
  const courses = await getCourses();
  return courses.filter((c) => c.visibility === "open");
}

// GET /api/courses/:id — course detail. Returns null if it does not exist
// (the views and the route guard rely on that contract).
export async function getCourseById(id) {
  try {
    return await api.get(`/courses/${id}`);
  } catch {
    return null;
  }
}

// GET /api/courses/:id/full — the ENTIRE course for the editor: course fields
// + sections + items (welcome/content/review/quizz per section, WITH answers)
// + final assessment. Tutor-owner only.
export async function getCourseFull(id) {
  try {
    return await api.get(`/courses/${id}/full`);
  } catch {
    return null;
  }
}

// Generates a course code preview (format EDU-XXXX) for the editor UI.
// The server generates its own definitive code if none is provided.
export function generateCourseCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `EDU-${rand}`;
}

// RULE 2 — Create a course. POST /api/courses/full persists the course AND all
// its sections/items/final assessment in a single transaction.
export async function createCourse(payload) {
  if (!canCreateCourse()) throw new Error("Only tutors can create courses");
  const { course } = await api.post("/courses/full", payload);
  return course;
}

// RULE 3 — Update a course (owner only, validated server-side). Also syncs
// sections/items/final assessment in the same transaction.
export async function updateCourse(id, payload) {
  const { course } = await api.put(`/courses/${id}/full`, payload);
  return course;
}
