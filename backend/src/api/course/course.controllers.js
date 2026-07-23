import { courseServices } from "./course.services.js";
import { courseFullServices } from "./course.full.service.js";

// GET /api/courses — General catalog with visibility filters per role
export const getCourses = async (req, res, next) => {
  try {
    const courses = await courseServices.getCoursesForUser(req.user);
    return res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
};

// GET /api/courses/mine — Cursos exclusivos del Tutor autenticado
export const getMyCourses = async (req, res, next) => {
  try {
    const courses = await courseServices.getCoursesByTutor(req.user.id);
    return res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
};

// GET /api/courses/stats — Stats agregadas del tutor autenticado
export const getMyStats = async (req, res, next) => {
  try {
    const stats = await courseServices.getTutorStats(req.user.id);
    return res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

// GET /api/courses/:id — Detalle de un curso
export const getCourseById = async (req, res, next) => {
  try {
    const course = await courseServices.getCourseById(req.params.id, req.user);
    if (!course) return res.status(404).json({ ok: false, message: "Course not found." });
    return res.status(200).json(course);
  } catch (error) {
    next(error);
  }
};

// POST /api/courses — Crear un curso inyectando el tutor_id del Token
export const createCourse = async (req, res, next) => {
  try {
    const newCourse = await courseServices.createNewCourse(req.user.id, req.body);
    return res.status(201).json({ ok: true, course: newCourse });
  } catch (error) {
    next(error);
  }
};

// PUT /api/courses/:id — Modificar un curso validando propiedad server-side
export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await courseServices.updateExistingCourse(id, req.user.id, req.body);

    if (result.error === "NOT_FOUND") {
      return res.status(404).json({ ok: false, message: "Course not found." });
    }
    if (result.error === "FORBIDDEN") {
      return res.status(403).json({ ok: false, message: "Forbidden: You do not own this course." });
    }

    return res.status(200).json({ ok: true, course: result.course });
  } catch (error) {
    next(error);
  }
};

// ─── Full course (editor): course + sections + items + final in one shot ─────

// GET /api/courses/:id/full — aggregated course for the tutor's editor
export const getCourseFull = async (req, res, next) => {
  try {
    const course = await courseFullServices.getFull(req.params.id, req.user.id);
    return res.status(200).json(course);
  } catch (error) {
    next(error);
  }
};

// POST /api/courses/full — create the course and ALL its content at once
export const createCourseFull = async (req, res, next) => {
  try {
    const course = await courseFullServices.createFull(req.user.id, req.body);
    return res.status(201).json({ ok: true, course });
  } catch (error) {
    next(error);
  }
};

// PUT /api/courses/:id/full — update the course and sync ALL its content
export const updateCourseFull = async (req, res, next) => {
  try {
    const course = await courseFullServices.updateFull(req.params.id, req.user.id, req.body);
    return res.status(200).json({ ok: true, course });
  } catch (error) {
    next(error);
  }
};
