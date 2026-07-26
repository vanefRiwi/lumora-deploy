import { submissionRepository } from "./submission.repository.js";
import { itemRepository } from "../item/item.repository.js";
import { sectionRepository } from "../section/section.repository.js";
import { enrollmentRepository } from "../enrollment/enrollment.repository.js";

//  Grading is ALWAYS performed on the server: the client only sends
// the student's answers and never sees the correct ones beforehand (item.services
// strips them out during the GET request). This fixes the security vulnerability
// documented in the frontend's courseService.js (integration blocker).
function grade(questions, answers) {
  const total = questions.length;
  const correct = questions.filter((q) => answers?.[q.id] === q.correct).length;
  return { correct, total };
}

async function assertEnrolled(studentId, courseId) {
  const enrolled = await enrollmentRepository.isEnrolled(studentId, courseId);
  if (!enrolled) throw Object.assign(new Error("You are not enrolled on this course"), { status: 403 });
}

export const submissionServices = {
  /**
   * POST /api/submissions
   * body: { type: "quizz"|"review"|"final", section_id?, course_id, answers, correct? }
   */
  submit: async (studentId, body) => {
    const { type, section_id, course_id, answers } = body;

    if (type === "quizz") {
      if (!section_id) throw Object.assign(new Error("section_id es obligatorio"), { status: 400 });
      const section = await sectionRepository.findById(section_id);
      if (!section) throw Object.assign(new Error("Section not found"), { status: 404 });
      await assertEnrolled(studentId, section.course_id);

      const quizz = await itemRepository.findSingle(section_id, "quizz");
      if (!quizz) throw Object.assign(new Error("This quizz does not exist"), { status: 404 });

      const questions = quizz.payload.questions || [];
      const { correct, total } = grade(questions, answers);
      const points = total ? Math.round((correct / total) * (quizz.points || 50)) : 0;

      await submissionRepository.upsertSection({
        studentId, courseId: section.course_id, sectionId: section_id, itemType: "quizz",
        answers, score: correct, total, points, correct: null,
      });

       // correctAnswers is sent ONLY in the submit response (never in the GET request),
      // so that the view highlights the correct options in green after submission.
      const correctAnswers = Object.fromEntries(questions.map((q) => [q.id, q.correct]));
      return { correct, total, points, correctAnswers };
    }

    if (type === "final") {
      if (!course_id) throw Object.assign(new Error("course_id is mandatory"), { status: 400 });
      await assertEnrolled(studentId, course_id);

      const final = await itemRepository.findFinal(course_id);
      if (!final) throw Object.assign(new Error("This final assestment does not exist"), { status: 404 });

      const questions = final.payload.questions || [];
      const { correct, total } = grade(questions, answers);
      const points = total ? Math.round((correct / total) * (final.points || 200)) : 0;

      await submissionRepository.upsertFinal({
        studentId, courseId: course_id, answers, score: correct, total, points,
      });

      const correctAnswers = Object.fromEntries(questions.map((q) => [q.id, q.correct]));
      return { correct, total, points, correctAnswers };
    }

    if (type === "review") {
      // Reviews are for practice: they don't award points or undergo server-side validation;
      // only their completion is recorded (just like the frontend contract).
      if (!section_id) throw Object.assign(new Error("section_id is mandatory"), { status: 400 });
      const section = await sectionRepository.findById(section_id);
      if (!section) throw Object.assign(new Error("Section not found"), { status: 404 });
      await assertEnrolled(studentId, section.course_id);

      await submissionRepository.upsertSection({
        studentId, courseId: section.course_id, sectionId: section_id, itemType: "review",
        answers: answers || null, score: null, total: null, points: 0, correct: Boolean(body.correct),
      });

      return { completed: true, correct: Boolean(body.correct) };
    }

    throw Object.assign(new Error("Invalid type of submission"), { status: 400 });
  },

  /**
   * GET /api/courses/:courseId/progress — progress of authenticated student.
   */
  getProgress: async (studentId, courseId) => {
    const rows = await submissionRepository.findAllForStudentInCourse(studentId, courseId);

    const progress = { quizzes: {}, reviews: {}, final: null };
    for (const row of rows) {
      if (row.item_type === "quizz") {
        progress.quizzes[row.section_id] = { score: row.score, total: row.total, points: row.points };
      } else if (row.item_type === "review") {
        progress.reviews[row.section_id] = { correct: row.correct, completed: true };
      } else if (row.item_type === "final") {
        progress.final = { score: row.score, total: row.total, points: row.points };
      }
    }
    return progress;
  },
};
