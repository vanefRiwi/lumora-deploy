import { Router } from "express";
import { getSections, createSection, getSectionItems } from "./section.controllers.js";
import { verifyJWT, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validation.middleware.js";

const router = Router();

router.get("/courses/:courseId/sections", verifyJWT, getSections);
router.post("/courses/:courseId/sections", verifyJWT, authorizeRoles("tutor"), validateBody(["title"]), createSection);
router.get("/sections/:sectionId/items", verifyJWT, getSectionItems);

export default router;
