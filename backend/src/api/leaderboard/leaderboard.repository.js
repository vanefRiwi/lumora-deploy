import { pool } from "../../config/postgres/postgres.db.js";

export const leaderboardRepository = {
  // Suma de puntos por estudiante en el curso (solo quizz + final; las reviews no puntúan).
  findForCourse: async (courseId) => {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name AS name, COALESCE(SUM(s.points), 0)::int AS points
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       LEFT JOIN submissions s
         ON s.student_id = u.id AND s.course_id = e.course_id AND s.item_type IN ('quizz', 'final')
       WHERE e.course_id = $1
       GROUP BY u.id
       ORDER BY points DESC;`,
      [courseId]
    );
    return rows;
  },
};
