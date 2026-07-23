import { submissionRepository } from "./submission.repository.js";
import { itemRepository } from "../item/item.repository.js";
import { sectionRepository } from "../section/section.repository.js";
import { enrollmentRepository } from "../enrollment/enrollment.repository.js";

// 🔒 La calificación SIEMPRE se hace en el servidor: el cliente solo manda
// las respuestas del alumno, nunca ve las correctas de antemano (item.services
// las quita en el GET). Esto corrige el hueco de seguridad documentado en
// courseService.js del frontend (Blocker de integración).
function grade(questions, answers) {
  const total = questions.length;
  const correct = questions.filter((q) => answers?.[q.id] === q.correct).length;
  return { correct, total };
}

async function assertEnrolled(studentId, courseId) {
  const enrolled = await enrollmentRepository.isEnrolled(studentId, courseId);
  if (!enrolled) throw Object.assign(new Error("No estás inscrito en este curso"), { status: 403 });
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
      if (!section) throw Object.assign(new Error("Sección no encontrada"), { status: 404 });
      await assertEnrolled(studentId, section.course_id);

      const quizz = await itemRepository.findSingle(section_id, "quizz");
      if (!quizz) throw Object.assign(new Error("Este quizz no existe"), { status: 404 });

      const questions = quizz.payload.questions || [];
      const { correct, total } = grade(questions, answers);
      const points = total ? Math.round((correct / total) * (quizz.points || 50)) : 0;

      await submissionRepository.upsertSection({
        studentId, courseId: section.course_id, sectionId: section_id, itemType: "quizz",
        answers, score: correct, total, points, correct: null,
      });

      // correctAnswers viaja SOLO en la respuesta del submit (nunca en el GET),
      // para que la vista pinte en verde las opciones correctas tras enviar.
      const correctAnswers = Object.fromEntries(questions.map((q) => [q.id, q.correct]));
      return { correct, total, points, correctAnswers };
    }

    if (type === "final") {
      if (!course_id) throw Object.assign(new Error("course_id es obligatorio"), { status: 400 });
      await assertEnrolled(studentId, course_id);

      const final = await itemRepository.findFinal(course_id);
      if (!final) throw Object.assign(new Error("El examen final no existe"), { status: 404 });

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
      // Las reviews son práctica: no dan puntos ni pasan por corrección server-side,
      // solo se registra que se completaron (igual que el contrato del frontend).
      if (!section_id) throw Object.assign(new Error("section_id es obligatorio"), { status: 400 });
      const section = await sectionRepository.findById(section_id);
      if (!section) throw Object.assign(new Error("Sección no encontrada"), { status: 404 });
      await assertEnrolled(studentId, section.course_id);

      await submissionRepository.upsertSection({
        studentId, courseId: section.course_id, sectionId: section_id, itemType: "review",
        answers: answers || null, score: null, total: null, points: 0, correct: Boolean(body.correct),
      });

      return { completed: true, correct: Boolean(body.correct) };
    }

    throw Object.assign(new Error("Tipo de submission inválido"), { status: 400 });
  },

  /**
   * GET /api/courses/:courseId/progress — progreso del estudiante autenticado.
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
