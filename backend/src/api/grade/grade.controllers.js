import { gradeServices } from "./grade.services.js";

// GET /api/courses/:courseId/students
export const getCourseStudents = async (req, res, next) => {
  try {
    const students = await gradeServices.getCourseStudents(req.params.courseId, req.user.id);
    return res.status(200).json(students);
  } catch (error) {
    next(error);
  }
};
