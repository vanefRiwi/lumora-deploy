import { Router } from "express";
import { getMe, updateMe } from "./user.controllers.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/me", verifyJWT, getMe);
router.put("/me", verifyJWT, updateMe);

export default router;
