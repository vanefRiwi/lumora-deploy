import { courseRepository } from "./course.repository.js";

// Genera un código único de curso (formato EDU-XXXX), igual que el frontend.
function generateCourseCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `EDU-${rand}`;
}

// Mapea la fila cruda de la DB al shape que espera el frontend.
function toPublicCourse(row, { hideCode } = {}) {
  const { is_enrolled, base_students, ...rest } = row;
  const course = { ...rest, baseStudents: base_students };
  if (hideCode) delete course.course_code;
  return course;
}

export const courseServices = {
  /**
   * 🎓 Catálogo (Regla 1): students solo ven cursos "open" o donde ya están
   * inscritos (aunque sean "code"). El course_code nunca se expone a students.
   */
  getCoursesForUser: async (userContext) => {
    const rows = await courseRepository.findAllWithStats(userContext.id);

    if (userContext.role === "student") {
      return rows
        .filter((c) => c.visibility === "open" || c.is_enrolled)
        .map((c) => toPublicCourse(c, { hideCode: true }));
    }

    // Tutor: ve el catálogo completo para administración.
    return rows.map((c) => toPublicCourse(c));
  },

  getCoursesByTutor: async (tutorId) => {
    const rows = await courseRepository.findByTutor(tutorId);
    return rows.map((c) => toPublicCourse(c));
  },

  getCourseById: async (id, userContext) => {
    const course = await courseRepository.findById(id);
    if (!course) return null;
    const hideCode = userContext?.role === "student" && course.visibility !== "code";
    return toPublicCourse(course, { hideCode: userContext?.role === "student" && hideCode });
  },

  createNewCourse: async (tutorId, payload) => {
    if (!payload.title?.trim()) {
      throw Object.assign(new Error("El título del curso es obligatorio"), { status: 400 });
    }

    const visibility = payload.visibility === "code" ? "code" : "open";
    const course_code = visibility === "code" ? (payload.course_code || generateCourseCode()) : null;

    const created = await courseRepository.create({
      tutor_id: Number(tutorId), // 🔒 nunca confiamos en el body para esto
      title: payload.title,
      instructor: payload.instructor || "Tutor",
      category: payload.category || "General",
      level: payload.level || "Beginner",
      description: payload.description || "",
      image: payload.image || "https://placehold.co/400x220",
      visibility,
      course_code,
    });
    return toPublicCourse(created);
  },

  updateExistingCourse: async (courseId, tutorId, updatedData) => {
    const course = await courseRepository.findById(courseId);
    if (!course) return { error: "NOT_FOUND" };

    // 🔴 Regla 3 — Validación de propiedad estricta del tutor dueño.
    if (course.tutor_id !== Number(tutorId)) return { error: "FORBIDDEN" };

    // course_code es INMUTABLE una vez asignado; solo se genera si pasa a
    // "code" por primera vez.
    let course_code = course.course_code;
    const visibility = updatedData.visibility === "code" ? "code" : (updatedData.visibility || course.visibility);
    if (visibility === "code" && !course_code) {
      course_code = generateCourseCode();
    }

    const updated = await courseRepository.update(courseId, {
      title: updatedData.title ?? course.title,
      instructor: updatedData.instructor ?? course.instructor,
      category: updatedData.category ?? course.category,
      level: updatedData.level ?? course.level,
      description: updatedData.description ?? course.description,
      image: updatedData.image ?? course.image,
      visibility,
      course_code,
    });

    return { error: null, course: toPublicCourse(updated) };
  },

  getTutorStats: async (tutorId) => {
    const stats = await courseRepository.statsForTutor(tutorId);
    return {
      totalCourses: stats.total_courses,
      totalStudents: stats.total_students,
      totalSections: stats.total_sections,
      sectionsPerCourse: stats.total_courses ? Math.round(stats.total_sections / stats.total_courses) : 0,
    };
  },
};
