import { Router } from "express";
import {
  upsertWelcome,
  upsertReview,
  upsertQuizz,
  getFinalAssessment,
  upsertFinalAssessment,
  getContents,
  createContent,
  updateContent,
  deleteContent,
} from "./item.controllers.js";
import { verifyJWT, authorizeRoles } from "../../middlewares/auth.middleware.js";

const router = Router();

router.put("/sections/:sectionId/welcome", verifyJWT, authorizeRoles("tutor"), upsertWelcome);
router.put("/sections/:sectionId/review", verifyJWT, authorizeRoles("tutor"), upsertReview);
router.put("/sections/:sectionId/quizz", verifyJWT, authorizeRoles("tutor"), upsertQuizz);

router.get("/courses/:courseId/final-assessment", verifyJWT, getFinalAssessment);
router.put("/courses/:courseId/final-assessment", verifyJWT, authorizeRoles("tutor"), upsertFinalAssessment);

router.get("/sections/:sectionId/contents", verifyJWT, getContents);
router.post("/sections/:sectionId/contents", verifyJWT, authorizeRoles("tutor"), createContent);
router.put("/contents/:id", verifyJWT, authorizeRoles("tutor"), updateContent);
router.delete("/contents/:id", verifyJWT, authorizeRoles("tutor"), deleteContent);

export default router;
