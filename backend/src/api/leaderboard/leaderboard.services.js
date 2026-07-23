import { leaderboardRepository } from "./leaderboard.repository.js";

export const leaderboardServices = {
  getForCourse: async (courseId) => {
    return leaderboardRepository.findForCourse(courseId);
  },
};
