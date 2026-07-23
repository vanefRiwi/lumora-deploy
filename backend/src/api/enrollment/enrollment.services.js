import { enrollmentRepository } from "./enrollment.repository.js";
import { courseRepository } from "../course/course.repository.js";

export const enrollmentServices = {
  getMyEnrolledIds: async (studentId) => {
    return enrollmentRepository.findByStudent(studentId);
  },

  // Unirse a un curso ABIERTO (Regla 1: los "code" no se listan aquí).
  joinOpenCourse: async (studentId, courseId) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw Object.assign(new Error("Curso no encontrado"), { status: 404 });
    if (course.visibility !== "open") {
      throw Object.assign(new Error("Este curso requiere un código de acceso"), { status: 400 });
    }

    const already = await enrollmentRepository.isEnrolled(studentId, courseId);
    if (already) throw Object.assign(new Error("Ya estás inscrito en este curso"), { status: 400 });

    await enrollmentRepository.create(studentId, courseId);
    return course;
  },

  // Unirse a un curso PRIVADO usando su código.
  joinByCode: async (studentId, code) => {
    const clean = (code || "").trim().toUpperCase();
    if (!clean) throw Object.assign(new Error("Ingresa un código de curso"), { status: 400 });

    const course = await courseRepository.findByCode(clean);
    if (!course) throw Object.assign(new Error("Código de curso inválido"), { status: 400 });

    const already = await enrollmentRepository.isEnrolled(studentId, course.id);
    if (already) throw Object.assign(new Error("Ya estás inscrito en este curso"), { status: 400 });

    await enrollmentRepository.create(studentId, course.id);
    return course;
  },

  leaveCourse: async (studentId, courseId) => {
    await enrollmentRepository.remove(studentId, courseId);
    return true;
  },
};
