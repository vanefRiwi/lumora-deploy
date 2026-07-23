// ─── MOCK: Enrolled students and their progress ────────────────────────────────
//  Format designed for the backend.
// FUTURE: GET /api/courses/:id/students -> returns students with their submissions.
//
//   StudentProgress = {
//     id, full_name, email,
//     progress: { quizzes: { [sectionId]: {score,total,points} }, final: {...} }
//   }
// The frontend calculates the grade using `calculateFinalGrade()` based on that `progress`,
// so that the formula is IDENTICAL for both the student and the instructor.

export const MOCK_ENROLLED_STUDENTS = {
  // key = course_id
  1: [
    {
      id: 10, full_name: "Jordan Kim", email: "jordan.kim@example.com",
      progress: {
        quizzes: {
          1: { score: 3, total: 3, points: 50 },
          2: { score: 1, total: 1, points: 50 },
          3: { score: 1, total: 1, points: 50 },
        },
        final: { score: 2, total: 2, points: 200 },
      },
    },
    {
      id: 11, full_name: "Sarah Liu", email: "sarah.liu@example.com",
      progress: {
        quizzes: {
          1: { score: 3, total: 3, points: 50 },
          2: { score: 1, total: 1, points: 50 },
          3: { score: 0, total: 1, points: 0 },
        },
        final: { score: 2, total: 2, points: 200 },
      },
    },
    {
      id: 12, full_name: "Michael Torres", email: "michael.t@example.com",
      progress: { quizzes: { 1: { score: 2, total: 3, points: 33 } }, final: null },
    },
    {
      id: 13, full_name: "Priya Sharma", email: "priya.s@example.com",
      progress: {
        quizzes: {
          1: { score: 2, total: 3, points: 33 },
          2: { score: 1, total: 1, points: 50 },
          3: { score: 1, total: 1, points: 50 },
        },
        final: { score: 1, total: 2, points: 100 },
      },
    },
    {
      id: 14, full_name: "Alex Chen", email: "alex.chen@example.com",
      progress: {
        quizzes: {
          1: { score: 3, total: 3, points: 50 },
          2: { score: 1, total: 1, points: 50 },
          3: { score: 1, total: 1, points: 50 },
        },
        final: { score: 2, total: 2, points: 200 },
      },
    },
    {
      id: 15, full_name: "Emma Walsh", email: "emma.w@example.com",
      progress: { quizzes: {}, final: null },   // It hasn't started yet
    },
    {
      id: 16, full_name: "Omar Hassan", email: "omar.h@example.com",
      progress: {
        quizzes: {
          1: { score: 3, total: 3, points: 50 },
          2: { score: 1, total: 1, points: 50 },
        },
        final: null,
      },
    },
    {
      id: 17, full_name: "Lena Park", email: "lena.p@example.com",
      progress: {
        quizzes: {
          1: { score: 2, total: 3, points: 33 },
          2: { score: 0, total: 1, points: 0 },
          3: { score: 1, total: 1, points: 50 },
        },
        final: { score: 1, total: 2, points: 100 },
      },
    },
  ],
};

// Default students for courses without specific data
export const DEFAULT_STUDENTS = [
  {
    id: 20, full_name: "Test Student", email: "test@example.com",
    progress: { quizzes: {}, final: null },
  },
];
