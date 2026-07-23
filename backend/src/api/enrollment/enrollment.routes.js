import { Router } from "express";
import { getMyEnrollments, joinCourse, joinCourseByCode, leaveCourse } from "./enrollment.controllers.js";
import { verifyJWT, authorizeRoles } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/mine", verifyJWT, authorizeRoles("student"), getMyEnrollments);
router.post("/", verifyJWT, authorizeRoles("student"), joinCourse);
router.post("/by-code", verifyJWT, authorizeRoles("student"), joinCourseByCode);
router.delete("/:courseId", verifyJWT, authorizeRoles("student"), leaveCourse);

export default router;
