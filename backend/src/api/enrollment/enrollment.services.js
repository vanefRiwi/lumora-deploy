import { enrollmentRepository } from "./enrollment.repository.js";
import { courseRepository } from "../course/course.repository.js";

export const enrollmentServices = {
  getMyEnrolledIds: async (studentId) => {
    return enrollmentRepository.findByStudent(studentId);
  },

  // Join an OPEN COURSE (Rule 1: "code" is not listed here).
  joinOpenCourse: async (studentId, courseId) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw Object.assign(new Error("Course not found"), { status: 404 });
    if (course.visibility !== "open") {
      throw Object.assign(new Error("This course requires an access code"), { status: 400 });
    }

    const already = await enrollmentRepository.isEnrolled(studentId, courseId);
    if (already) throw Object.assign(new Error("You are already enrolled on this course"), { status: 400 });

    await enrollmentRepository.create(studentId, courseId);
    return course;
  },

  // Join a PRIVATE course using it's code
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
