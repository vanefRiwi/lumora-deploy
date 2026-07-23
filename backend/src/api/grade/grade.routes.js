import { Router } from "express";
import { getCourseStudents } from "./grade.controllers.js";
import { verifyJWT, authorizeRoles } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/courses/:courseId/students", verifyJWT, authorizeRoles("tutor"), getCourseStudents);

export default router;
