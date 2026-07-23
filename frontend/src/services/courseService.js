// ─── Course Service ───────────────────────────────────────────────────────────
// Gateway to course content (sections, items, progress, submissions).
//
// FULLY INTEGRATED with the backend:
//  - Sections, items, final assessment and leaderboard come from PostgreSQL.
//  - GRADING happens ON THE SERVER: students never receive the `correct` field
//    (GET /sections/:id/items strips it) and POST /api/submissions grades and
//    returns { correct, total, points, correctAnswers }.
//  - Progress lives in the `submissions` table, so it survives reloads,
//    logouts and device changes.
//
// The views did NOT change: they keep calling these same functions.

import { api } from "../helpers/api.js";
import { getSession } from "../helpers/auth.js";

const isTutor = () => getSession()?.role === "tutor";

// ── Course structure ──────────────────────────────────────────────────────────

// GET /api/courses/:id/sections
export async function getSections(courseId) {
  return api.get(`/courses/${courseId}/sections`);
}

// GET /api/sections/:id/items -> { welcome, contents, review, quizz }
// (courseId kept in the signature for compatibility with the views)
export async function getSectionItems(courseId, sectionId) {
  return api.get(`/sections/${sectionId}/items`);
}

// GET /api/courses/:id/final-assessment (sanitized for students)
export async function getFinalAssessment(courseId) {
  return api.get(`/courses/${courseId}/final-assessment`);
}

// GET /api/courses/:id/leaderboard — real points from the submissions table
export async function getLeaderboard(courseId) {
  return api.get(`/courses/${courseId}/leaderboard`);
}

// ── Student progress ──────────────────────────────────────────────────────────

const EMPTY_PROGRESS = () => ({ quizzes: {}, reviews: {}, final: null });

// GET /api/courses/:id/progress — progress of the authenticated student.
// Tutors (preview mode) have no submissions: they get an empty progress.
export async function getProgress(courseId) {
  if (isTutor()) return EMPTY_PROGRESS();
  try {
    return await api.get(`/courses/${courseId}/progress`);
  } catch {
    return EMPTY_PROGRESS();
  }
}

// Local grading used ONLY for the tutor's "Preview as student" mode, where the
// quiz payload still contains `correct` and nothing must be persisted.
function previewGrade(quiz, answers, maxPoints) {
  const correct = quiz.questions.filter((q) => answers[q.id] === q.correct).length;
  const total = quiz.questions.length;
  const points = total ? Math.round((correct / total) * (quiz.points || maxPoints)) : 0;
  const correctAnswers = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correct]));
  return { correct, total, points, correctAnswers };
}

// POST /api/submissions — quiz submission. The SERVER grades and persists.
export async function submitQuizz(courseId, sectionId, { quiz, answers }) {
  if (isTutor()) {
    // Preview: grade locally, never persist.
    const result = previewGrade(quiz, answers, 50);
    const p = EMPTY_PROGRESS();
    p.quizzes[sectionId] = { score: result.correct, total: result.total, points: result.points };
    return { progress: p, result };
  }

  const { result } = await api.post("/submissions", {
    type: "quizz",
    section_id: sectionId,
    answers,
  });
  return { progress: await getProgress(courseId), result };
}

// POST /api/submissions — review completion.
// ⚠️ Reviews do NOT award leaderboard points (only quizzes do): they are
// practice activities with instant feedback.
export async function submitReview(courseId, sectionId, { correct }) {
  if (isTutor()) {
    const p = EMPTY_PROGRESS();
    p.reviews[sectionId] = { correct, completed: true };
    return p;
  }

  await api.post("/submissions", { type: "review", section_id: sectionId, correct });
  return getProgress(courseId);
}

// POST /api/submissions — final assessment. Graded and persisted server-side.
export async function submitFinal(courseId, { quiz, answers }) {
  if (isTutor()) {
    const result = previewGrade(quiz, answers, 200);
    const p = EMPTY_PROGRESS();
    p.final = { score: result.correct, total: result.total, points: result.points };
    return { progress: p, result };
  }

  const { result } = await api.post("/submissions", {
    type: "final",
    course_id: courseId,
    answers,
  });
  return { progress: await getProgress(courseId), result };
}

// ── Unlock Rules (Progressive Unlock) ────────────────────────────────────────

// A section is unlocked if it is the first one, or if the quiz from the
// PREVIOUS section has already been completed.
export function isSectionUnlocked(sections, sectionId, progress) {
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx <= 0) return true;                       // the first one is always open
  const prev = sections[idx - 1];
  return Boolean(progress.quizzes[prev.id]);       // Did you take the quiz above?
}

// The final exam is unlocked after completing ALL the quizzes
export function isFinalUnlocked(sections, progress) {
  return sections.every((s) => Boolean(progress.quizzes[s.id]));
}

// ── Grade Calculation (reusable: Student Grades + Instructor Dashboard) ───────

// FINAL COURSE GRADE
// Average of the quizzes for each section + the final exam. Unsubmitted items
// count as 0. Returns null if the student has not yet submitted ANYTHING.
export function finalGrade(sections, progress) {
  const totalItems = sections.length + 1;          // quizzes + final assessment
  if (!totalItems) return null;

  const pct = (r) => (r && r.total ? (r.score / r.total) * 100 : 0);

  const quizSum = sections.reduce((sum, s) => sum + pct(progress.quizzes[s.id]), 0);
  const finalSum = pct(progress.final);

  const presented =
    sections.filter((s) => progress.quizzes[s.id]).length + (progress.final ? 1 : 0);
  if (!presented) return null;

  return Math.round(((quizSum + finalSum) / totalItems) * 10) / 10;
}

// Breakdown of individual grades (for the tutor's report and the Grades panel)
export function gradeBreakdown(sections, progress) {
  const rows = sections.map((s) => {
    const q = progress.quizzes[s.id];
    return {
      id: s.id,
      label: `Quizz — ${s.title}`,
      score: q?.score ?? null,
      total: q?.total ?? null,
      percent: q ? Math.round((q.score / q.total) * 100) : null,
      points: q?.points ?? 0,
      status: q ? "Graded" : "Not started",
    };
  });

  const f = progress.final;
  rows.push({
    id: "final",
    label: "Final Assessment",
    score: f?.score ?? null,
    total: f?.total ?? null,
    percent: f ? Math.round((f.score / f.total) * 100) : null,
    points: f?.points ?? 0,
    status: f ? "Graded" : isFinalUnlocked(sections, progress) ? "Not started" : "Locked",
  });

  return rows;
}

// Total leaderboard points (ONLY quizzes + final; reviews do not score)
export function totalPoints(sections, progress) {
  const fromQuizzes = sections.reduce(
    (sum, s) => sum + (progress.quizzes[s.id]?.points || 0), 0
  );
  return fromQuizzes + (progress.final?.points || 0);
}

// ─── Calculation of the FINAL GRADE (single source of truth) ─────────────────
//
// Formula: average of (quizzes for each section + final exam).
//   grade = sum(percentages) / (number of sections + 1)
// Items not submitted count as 0. Reviews do NOT count.
// Used by BOTH the student's "My Grades" and the instructor's Dashboard.
export function calculateFinalGrade(sections, progress) {
  const safe = progress || { quizzes: {}, reviews: {}, final: null };
  const quizzes = safe.quizzes || {};
  const totalItems = sections.length + 1;   // quizzes + final assessment

  if (!sections.length) {
    return { grade: 0, breakdown: [], completed: 0, totalItems: 0, points: 0 };
  }

  const breakdown = [];
  let sum = 0;
  let completed = 0;

  // One item for each section quiz
  sections.forEach((sec) => {
    const q = quizzes[sec.id];
    const pct = q ? Math.round((q.score / q.total) * 100) : 0;
    if (q) { sum += pct; completed++; }
    breakdown.push({
      id: sec.id,
      label: `Quizz — ${sec.title}`,
      score: q ? q.score : null,
      total: q ? q.total : null,
      pct: q ? pct : null,
      points: q?.points || 0,
      status: q ? "graded" : "pending",
    });
  });

  // The final exam is just one more item
  const f = safe.final;
  const fPct = f ? Math.round((f.score / f.total) * 100) : 0;
  if (f) { sum += fPct; completed++; }
  breakdown.push({
    id: "final",
    label: "Final Assessment",
    score: f ? f.score : null,
    total: f ? f.total : null,
    pct: f ? fPct : null,
    points: f?.points || 0,
    status: f ? "graded" : isFinalUnlocked(sections, safe) ? "pending" : "locked",
  });

  // Final score: average of ALL items (uncompleted items count as 0)
  const grade = Math.round((sum / totalItems) * 10) / 10;

  // Leaderboard points: ONLY quizzes + final (reviews do not earn points)
  const points = breakdown.reduce((acc, b) => acc + (b.points || 0), 0);

  // Maximum possible points for the course (for "Out of X total").
  const maxPoints = sections.length * 50 + 200;

  return { grade, breakdown, completed, totalItems, points, maxPoints };
}

// ─── Instructor Dashboard ─────────────────────────────────────────────────────

// GET /api/courses/:id/students (tutor-owner only)
// The backend returns each enrolled student with their `progress` (same shape
// as GET /courses/:id/progress) plus server-computed finalGrade/breakdown, so
// the tutor and the student always see the same numbers.
export async function getEnrolledStudents(courseId) {
  return api.get(`/courses/${courseId}/students`);
}

// Alias kept for compatibility with older views.
export async function getCourseStudents(courseId) {
  return getEnrolledStudents(courseId);
}

// Course Statistics for the Dashboard
export function courseStats(students) {
  const graded = students.filter((s) => s.finalGrade !== null);
  const avg = graded.length
    ? Math.round(graded.reduce((sum, s) => sum + s.finalGrade, 0) / graded.length)
    : 0;

  return {
    enrolled: students.length,
    averageGrade: avg,
    completed: students.filter((s) => s.breakdown.every((b) => b.status === "Graded")).length,
  };
}
