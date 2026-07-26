import { Router } from "express";
import {
  getCourses,
  getMyCourses,
  getMyStats,
  getCourseById,
  createCourse,
  updateCourse,
  getCourseFull,
  createCourseFull,
  updateCourseFull,
} from "./course.controllers.js";
import { verifyJWT, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validation.middleware.js";

const router = Router();

//  general catalog (for students and tutors)
router.get("/", verifyJWT, getCourses);

//  Panel Tutor: only courses with authenticated tutor
router.get("/mine", verifyJWT, authorizeRoles("tutor"), getMyCourses);

//  Stats added for the authenticated tutor 
router.get("/stats", verifyJWT, authorizeRoles("tutor"), getMyStats);

//  Create course (exclusive to Tutor)
router.post("/", verifyJWT, authorizeRoles("tutor"), validateBody(["title"]), createCourse);

//   Complete Course for editor (course + sections + items + final)
router.post("/full", verifyJWT, authorizeRoles("tutor"), validateBody(["title"]), createCourseFull);
router.get("/:id/full", verifyJWT, authorizeRoles("tutor"), getCourseFull);
router.put("/:id/full", verifyJWT, authorizeRoles("tutor"), validateBody(["title"]), updateCourseFull);

//specific detail of a course
router.get("/:id", verifyJWT, getCourseById);

//  Edit course (exclusive for Tutor owner)
router.put("/:id", verifyJWT, authorizeRoles("tutor"), updateCourse);

export default router;
