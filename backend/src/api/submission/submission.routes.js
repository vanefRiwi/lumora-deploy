import { Router } from "express";
import { submit, getProgress } from "./submission.controllers.js";
import { verifyJWT, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validation.middleware.js";

const router = Router();

router.post("/submissions", verifyJWT, authorizeRoles("student"), validateBody(["type"]), submit);
router.get("/courses/:courseId/progress", verifyJWT, authorizeRoles("student"), getProgress);

export default router;
