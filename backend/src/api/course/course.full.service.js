import { courseServices } from "./course.services.js";
import { courseRepository } from "./course.repository.js";
import { courseFullRepository } from "./course.full.repository.js";
import { sectionRepository } from "../section/section.repository.js";
import { itemRepository } from "../item/item.repository.js";

async function assertOwner(courseId, tutorId) {
  const course = await courseRepository.findById(courseId);
  if (!course) throw Object.assign(new Error("Curso no encontrado"), { status: 404 });
  if (course.tutor_id !== Number(tutorId)) {
    throw Object.assign(new Error("No eres dueño de este curso"), { status: 403 });
  }
  return course;
}

/**
 * Builds the aggregated shape the editor consumes:
 *   { ...course, sections, items: { [sectionId]: { welcome, content, review, quizz } }, finalAssessment }
 * Includes the `correct` field of quizzes: this endpoint is TUTOR-OWNER only.
 */
async function buildFullCourse(courseId) {
  const course = await courseRepository.findById(courseId);
  const sections = await sectionRepository.findByCourse(courseId);

  const items = {};
  for (const sec of sections) {
    const [welcome, contents, review, quizz] = await Promise.all([
      itemRepository.findSingle(sec.id, "welcome"),
      itemRepository.findContents(sec.id),
      itemRepository.findSingle(sec.id, "review"),
      itemRepository.findSingle(sec.id, "quizz"),
    ]);

    items[sec.id] = {
      welcome: welcome?.payload || { message: "", videoUrl: "" },
      content: contents.map((c) => ({
        id: c.id, titulo: c.titulo, tipo: c.tipo, datos: c.payload?.datos || "", orden: c.orden,
      })),
      review: review
        ? { format: "fill-blanks", blankText: "", pairs: [], steps: [], instantFeedback: true, ...review.payload }
        : null,
      quizz: quizz
        ? { questions: quizz.payload.questions || [], countsGrade: quizz.payload.countsGrade !== false, points: quizz.points || 50 }
        : null,
    };
  }

  const final = await itemRepository.findFinal(courseId);
  const finalAssessment = final
    ? { questions: final.payload.questions || [], countsGrade: final.payload.countsGrade !== false, points: final.points || 200 }
    : { questions: [], countsGrade: true, points: 200 };

  const { base_students, ...rest } = course;
  return { ...rest, baseStudents: base_students, sections, items, finalAssessment };
}

export const courseFullServices = {
  // GET /api/courses/:id/full — aggregated course for the editor (owner only).
  getFull: async (courseId, tutorId) => {
    await assertOwner(courseId, tutorId);
    return buildFullCourse(courseId);
  },

  // POST /api/courses/full — create course + sections + items in one call.
  createFull: async (tutorId, payload) => {
    const course = await courseServices.createNewCourse(tutorId, payload);
    await courseFullRepository.syncContent(course.id, payload);
    return buildFullCourse(course.id);
  },

  // PUT /api/courses/:id/full — update course + sync sections/items/final.
  updateFull: async (courseId, tutorId, payload) => {
    await assertOwner(courseId, tutorId);

    const result = await courseServices.updateExistingCourse(courseId, tutorId, payload);
    if (result.error === "NOT_FOUND") throw Object.assign(new Error("Curso no encontrado"), { status: 404 });
    if (result.error === "FORBIDDEN") throw Object.assign(new Error("No eres dueño de este curso"), { status: 403 });

    await courseFullRepository.syncContent(courseId, payload);
    return buildFullCourse(courseId);
  },
};
