// ─── MOCK: Enrolled Students and Their Grades ──────────────────────────────────
// Feeds the tutor's dashboard.
//
// ⚠️ Format designed for the API:
//   GET /api/courses/:id/students
//   -> [{ id, full_name, email, grades: { quizzes: {sectionId: {...}}, final: {...} } }]
//
// The backend will calculate this using a JOIN between the `users`, `enrollments`, and `submissions` tables.

export const MOCK_ENROLLED_STUDENTS = {
  // key = course_id
  1: [
    {
      id: 10, full_name: "Jordan Kim", email: "jordan.kim@example.com",
      grades: {
        quizzes: { 1: { score: 9, total: 10, points: 45 }, 2: { score: 8, total: 10, points: 40 }, 3: { score: 10, total: 10, points: 50 } },
        final: { score: 18, total: 20, points: 180 },
      },
    },
    {
      id: 11, full_name: "Sarah Liu", email: "sarah.liu@example.com",
      grades: {
        quizzes: { 1: { score: 10, total: 10, points: 50 }, 2: { score: 9, total: 10, points: 45 }, 3: { score: 8, total: 10, points: 40 } },
        final: { score: 17, total: 20, points: 170 },
      },
    },
    {
      id: 12, full_name: "Michael Torres", email: "michael.torres@example.com",
      grades: {
        // Only took the first quiz -> still no final grade
        quizzes: { 1: { score: 7, total: 10, points: 35 } },
        final: null,
      },
    },
    {
      id: 13, full_name: "Priya Sharma", email: "priya.sharma@example.com",
      grades: {
        quizzes: { 1: { score: 6, total: 10, points: 30 }, 2: { score: 7, total: 10, points: 35 }, 3: { score: 8, total: 10, points: 40 } },
        final: { score: 14, total: 20, points: 140 },
      },
    },
    {
      id: 14, full_name: "Alex Chen", email: "alex.chen@example.com",
      grades: {
        quizzes: { 1: { score: 10, total: 10, points: 50 }, 2: { score: 10, total: 10, points: 50 }, 3: { score: 9, total: 10, points: 45 } },
        final: { score: 19, total: 20, points: 190 },
      },
    },
    {
      id: 15, full_name: "Emma Walsh", email: "emma.walsh@example.com",
      grades: {
        quizzes: {},         // It hasn't started yet
        final: null,
      },
    },
    {
      id: 16, full_name: "Omar Hassan", email: "omar.hassan@example.com",
      grades: {
        quizzes: { 1: { score: 8, total: 10, points: 40 }, 2: { score: 8, total: 10, points: 40 }, 3: { score: 7, total: 10, points: 35 } },
        final: { score: 16, total: 20, points: 160 },
      },
    },
    {
      id: 17, full_name: "Lena Park", email: "lena.park@example.com",
      grades: {
        quizzes: { 1: { score: 5, total: 10, points: 25 }, 2: { score: 6, total: 10, points: 30 }, 3: { score: 7, total: 10, points: 35 } },
        final: { score: 13, total: 20, points: 130 },
      },
    },
  ],
};

// For courses with no data, an empty list is generated
export function studentsForCourse(courseId) {
  return MOCK_ENROLLED_STUDENTS[courseId] || [];
}
