import { sectionRepository } from "./section.repository.js";
import { courseRepository } from "../course/course.repository.js";
import { itemRepository } from "../item/item.repository.js";

async function assertCourseOwner(courseId, tutorId) {
  const course = await courseRepository.findById(courseId);
  if (!course) throw Object.assign(new Error("Curso no encontrado"), { status: 404 });
  if (course.tutor_id !== Number(tutorId)) {
    throw Object.assign(new Error("No eres dueño de este curso"), { status: 403 });
  }
  return course;
}

export const sectionServices = {
  getSectionsForCourse: async (courseId) => {
    return sectionRepository.findByCourse(courseId);
  },

  createSection: async (courseId, tutorId, { title }) => {
    await assertCourseOwner(courseId, tutorId);
    if (!title?.trim()) throw Object.assign(new Error("El título de la sección es obligatorio"), { status: 400 });

    const count = await sectionRepository.countByCourse(courseId);
    return sectionRepository.create(courseId, { title: title.trim(), orden: count + 1 });
  },

  /**
   * GET /api/sections/:id/items — agregado de welcome + contents + review + quizz.
   * El quizz/review pierden el campo "correct"/soluciones si quien pregunta es student.
   */
  getSectionItemsAggregate: async (sectionId, userContext) => {
    const section = await sectionRepository.findById(sectionId);
    if (!section) throw Object.assign(new Error("Sección no encontrada"), { status: 404 });

    const isStudent = userContext.role === "student";
    const [welcome, contents, review, quizz] = await Promise.all([
      itemRepository.findSingle(sectionId, "welcome"),
      itemRepository.findContents(sectionId),
      itemRepository.findSingle(sectionId, "review"),
      itemRepository.findSingle(sectionId, "quizz"),
    ]);

    return {
      welcome: welcome?.payload || { message: "", videoUrl: "" },
      contents: contents.map((c) => ({ id: c.id, titulo: c.titulo, tipo: c.tipo, datos: c.payload?.datos, orden: c.orden })),
      review: review ? { ...review.payload, points: review.points } : null,
      quizz: quizz ? sanitizeQuizz(quizz, isStudent) : null,
    };
  },
};

// Nunca se envían las respuestas correctas al frontend de un student.
function sanitizeQuizz(item, isStudent) {
  const payload = { points: item.points, questions: item.payload.questions || [] };
  if (isStudent) {
    payload.questions = payload.questions.map(({ correct, ...q }) => q);
  }
  return payload;
}
