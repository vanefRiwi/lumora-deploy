import { pool } from "../../config/postgres/postgres.db.js";

export const gradeRepository = {
  // Estudiantes inscritos en el curso + TODAS sus submissions, en una sola query.
  findStudentsWithSubmissions: async (courseId) => {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email,
              COALESCE(
                json_agg(
                  json_build_object(
                    'section_id', s.section_id, 'item_type', s.item_type,
                    'score', s.score, 'total', s.total, 'points', s.points
                  )
                ) FILTER (WHERE s.id IS NOT NULL), '[]'
              ) AS submissions
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       LEFT JOIN submissions s ON s.student_id = u.id AND s.course_id = e.course_id
       WHERE e.course_id = $1
       GROUP BY u.id
       ORDER BY u.full_name ASC;`,
      [courseId]
    );
    return rows;
  },
};
