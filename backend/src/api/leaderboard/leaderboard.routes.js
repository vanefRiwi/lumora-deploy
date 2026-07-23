import { Router } from "express";
import { getLeaderboard } from "./leaderboard.controllers.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/courses/:courseId/leaderboard", verifyJWT, getLeaderboard);

export default router;
