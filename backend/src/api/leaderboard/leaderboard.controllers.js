import { leaderboardServices } from "./leaderboard.services.js";

// GET /api/courses/:courseId/leaderboard
export const getLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await leaderboardServices.getForCourse(req.params.courseId);
    return res.status(200).json(leaderboard);
  } catch (error) {
    next(error);
  }
};
