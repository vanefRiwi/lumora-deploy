import { itemRepository } from "./item.repository.js";
import { sectionRepository } from "../section/section.repository.js";
import { courseRepository } from "../course/course.repository.js";

async function assertSectionOwner(sectionId, tutorId) {
  const section = await sectionRepository.findById(sectionId);
  if (!section) throw Object.assign(new Error("Sección no encontrada"), { status: 404 });
  const course = await courseRepository.findById(section.course_id);
  if (course.tutor_id !== Number(tutorId)) {
    throw Object.assign(new Error("No eres dueño de esta sección"), { status: 403 });
  }
  return section;
}

async function assertCourseOwner(courseId, tutorId) {
  const course = await courseRepository.findById(courseId);
  if (!course) throw Object.assign(new Error("Curso no encontrado"), { status: 404 });
  if (course.tutor_id !== Number(tutorId)) {
    throw Object.assign(new Error("No eres dueño de este curso"), { status: 403 });
  }
  return course;
}

function stripCorrect(questions = []) {
  return questions.map(({ correct, ...q }) => q);
}

export const itemServices = {
  // ── welcome ──
  upsertWelcome: async (sectionId, tutorId, { message, videoUrl }) => {
    await assertSectionOwner(sectionId, tutorId);
    const item = await itemRepository.upsertSingle(sectionId, "welcome", {
      payload: { message: message || "", videoUrl: videoUrl || "" },
      points: 0,
    });
    return item.payload;
  },

  // ── review ──
  upsertReview: async (sectionId, tutorId, payload) => {
    await assertSectionOwner(sectionId, tutorId);
    const { points, ...rest } = payload;
    const item = await itemRepository.upsertSingle(sectionId, "review", { payload: rest, points: points || 100 });
    return { ...item.payload, points: item.points };
  },

  // ── quizz ──
  upsertQuizz: async (sectionId, tutorId, { points, questions }) => {
    await assertSectionOwner(sectionId, tutorId);
    if (!Array.isArray(questions) || !questions.length) {
      throw Object.assign(new Error("El quizz necesita al menos una pregunta"), { status: 400 });
    }
    const item = await itemRepository.upsertSingle(sectionId, "quizz", {
      payload: { questions },
      points: points || 50,
    });
    return { points: item.points, questions: item.payload.questions };
  },

  // ── final assessment ──
  getFinalAssessment: async (courseId, userContext) => {
    const item = await itemRepository.findFinal(courseId);
    if (!item) return { points: 200, questions: [] };
    const questions = userContext.role === "student" ? stripCorrect(item.payload.questions) : item.payload.questions;
    return { points: item.points, questions };
  },

  upsertFinalAssessment: async (courseId, tutorId, { points, questions }) => {
    await assertCourseOwner(courseId, tutorId);
    if (!Array.isArray(questions) || !questions.length) {
      throw Object.assign(new Error("El examen final necesita al menos una pregunta"), { status: 400 });
    }
    const item = await itemRepository.upsertFinal(courseId, { payload: { questions }, points: points || 200 });
    return { points: item.points, questions: item.payload.questions };
  },

  // ── content blocks ──
  getContents: async (sectionId) => {
    const rows = await itemRepository.findContents(sectionId);
    return rows.map((c) => ({ id: c.id, titulo: c.titulo, tipo: c.tipo, datos: c.payload?.datos || "", orden: c.orden }));
  },

  createContent: async (sectionId, tutorId, { titulo, tipo, datos }) => {
    await assertSectionOwner(sectionId, tutorId);
    if (!tipo) throw Object.assign(new Error("El tipo de contenido es obligatorio"), { status: 400 });

    const count = await itemRepository.countContents(sectionId);
    const created = await itemRepository.createContent(sectionId, { titulo, tipo, datos, orden: count + 1 });
    return { id: created.id, titulo: created.titulo, tipo: created.tipo, datos: created.payload?.datos || "", orden: created.orden };
  },

  updateContent: async (contentId, tutorId, patch) => {
    const existing = await itemRepository.findContentById(contentId);
    if (!existing) throw Object.assign(new Error("Contenido no encontrado"), { status: 404 });
    await assertSectionOwner(existing.section_id, tutorId);

    const updated = await itemRepository.updateContent(contentId, patch);
    return { id: updated.id, titulo: updated.titulo, tipo: updated.tipo, datos: updated.payload?.datos || "", orden: updated.orden };
  },

  deleteContent: async (contentId, tutorId) => {
    const existing = await itemRepository.findContentById(contentId);
    if (!existing) throw Object.assign(new Error("Contenido no encontrado"), { status: 404 });
    await assertSectionOwner(existing.section_id, tutorId);

    await itemRepository.deleteContent(contentId);
    return true;
  },
};
