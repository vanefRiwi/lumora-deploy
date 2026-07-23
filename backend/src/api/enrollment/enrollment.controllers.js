import { enrollmentServices } from "./enrollment.services.js";

// GET /api/enrollments/mine
export const getMyEnrollments = async (req, res, next) => {
  try {
    const ids = await enrollmentServices.getMyEnrolledIds(req.user.id);
    return res.status(200).json(ids);
  } catch (error) {
    next(error);
  }
};

// POST /api/enrollments  { course_id }
export const joinCourse = async (req, res, next) => {
  try {
    const course = await enrollmentServices.joinOpenCourse(req.user.id, req.body.course_id);
    return res.status(201).json({ ok: true, course });
  } catch (error) {
    next(error);
  }
};

// POST /api/enrollments/by-code  { code }
export const joinCourseByCode = async (req, res, next) => {
  try {
    const course = await enrollmentServices.joinByCode(req.user.id, req.body.code);
    return res.status(201).json({ ok: true, course });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/enrollments/:courseId
export const leaveCourse = async (req, res, next) => {
  try {
    await enrollmentServices.leaveCourse(req.user.id, req.params.courseId);
    return res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};
