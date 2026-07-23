// SPA Route Map.
import { introView, initIntro } from "../views/intro/introView.js";
import { loginView, initLogin } from "../views/auth/login.js";
import { registerView, initRegister } from "../views/auth/register.js";
import { studentHomeView, initStudentHome } from "../views/student/studentHome.js";
import { courseView, initCourseView } from "../views/student/courseView.js";
import { getCourseById, getEnrolledIds } from "../data/courses.js";
import { tutorHomeView, initTutorHome } from "../views/tutor/tutorHome.js";
import { dashboardView, initDashboard } from "../views/tutor/dashboardView.js";
import { courseEditorView, initCourseEditor } from "../views/tutor/courseEditorView.js";
import { profileView, initProfile } from "../views/shared/profileView.js";


// ─── Guard for /student/course ────────────────────────────────────────────────
// The course view is used by TWO roles, but under different conditions:
//
//   STUDENT -> only if ENROLLED in the course.
//   TUTOR   -> only in PREVIEW mode (?preview=1) and only for THEIR OWN
//              courses (Rule 3). Without the flag, or if the course belongs to another tutor,
//              access is denied (403).
//
//  This prevents a tutor from manually opening /student/course?id=1 and gaining unauthorized access
// to a student’s view of a course they do not teach.
async function canAccessCourse(session) {
  const params = new URLSearchParams(location.search);
  const courseId = Number(params.get("id"));
  const isPreview = params.get("preview") === "1";

  if (!courseId) return false;

  const course = await getCourseById(courseId);
  if (!course) return false;              // Course does not exist -> 403

  if (session.role === "tutor") {
    // Tutors can ONLY access the preview and ONLY their own courses
    return isPreview && course.tutor_id === session.id;
  }

  if (session.role === "student") {
    // Students can ONLY access courses they are enrolled in.
    // (And never in preview mode: that mode is for the instructor.)
    if (isPreview) return false;
    const enrolled = await getEnrolledIds();
    return enrolled.includes(courseId);
  }

  return false;
}

export const routes = {
  "/intro":            { view: introView,       init: initIntro,       roles: [] },
  "/login":            { view: loginView,       init: initLogin,       roles: [] },
  "/register":         { view: registerView,    init: initRegister,    roles: [] },

  "/student":          { view: studentHomeView, init: initStudentHome, roles: ["student"] },
  // The course view serves BOTH roles: the instructor uses it as “Preview as student”
  "/student/course":   { view: courseView,      init: initCourseView,  roles: ["student", "tutor"], canAccess: canAccessCourse },

  "/tutor":            { view: tutorHomeView,   init: initTutorHome,   roles: ["tutor"] },
  "/tutor/dashboard":  { view: dashboardView,   init: initDashboard,   roles: ["tutor"] },
  "/tutor/editor":     { view: courseEditorView, init: initCourseEditor, roles: ["tutor"] },

  // The profile is shared by both roles
  "/profile":          { view: profileView,     init: initProfile,     roles: ["student", "tutor"] },
};
