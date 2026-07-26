import { courseRepository } from "./course.repository.js";

// Generates a unique course code (EDU-XXXX format), just like the frontend.
function generateCourseCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `EDU-${rand}`;
}

//Maps the raw database row to the shape expected by the frontend.
function toPublicCourse(row, { hideCode } = {}) {
  const { is_enrolled, base_students, ...rest } = row;
  const course = { ...rest, baseStudents: base_students };
  if (hideCode) delete course.course_code;
  return course;
}

// The course description has a hard limit of 100 characters.
// The frontend enforces this with `maxlength`, but the actual validation happens here:
// we never rely on the client being the only filter.
const MAX_DESCRIPTION = 100;

function assertDescription(value) {
  if (String(value ?? "").trim().length > MAX_DESCRIPTION) {
    throw Object.assign(
      new Error(`Description can't be over ${MAX_DESCRIPTION} characters`),
      { status: 400 }
    );
  }
}

export const courseServices = {
  /**
   * Catalog (Rule 1): students  can only see "open" or where they are already enrolled
   * ( "code"). course_code never gets exposed to students.
   */
  getCoursesForUser: async (userContext) => {
    const rows = await courseRepository.findAllWithStats(userContext.id);

    if (userContext.role === "student") {
      return rows
        .filter((c) => c.visibility === "open" || c.is_enrolled)
        .map((c) => toPublicCourse(c, { hideCode: true }));
    }

    // Tutor: sees catalog for administration
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
      throw Object.assign(new Error("Course title is mandatory"), { status: 400 });
    }
    assertDescription(payload.description);

    const visibility = payload.visibility === "code" ? "code" : "open";
    const course_code = visibility === "code" ? (payload.course_code || generateCourseCode()) : null;

    const created = await courseRepository.create({
      tutor_id: Number(tutorId), // never trust body for this
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

    //  Rule 3 — tutor owner validation.
    if (course.tutor_id !== Number(tutorId)) return { error: "FORBIDDEN" };

    assertDescription(updatedData.description ?? course.description);

    // course_code is INMUTABLE once assigned; can only be generated if it switches to 
    // "code" for the first time.
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
