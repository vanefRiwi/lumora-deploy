import { pool } from "../../config/postgres/postgres.db.js";

export const enrollmentRepository = {
  findByStudent: async (studentId) => {
    const { rows } = await pool.query(`SELECT course_id FROM enrollments WHERE student_id = $1;`, [studentId]);
    return rows.map((r) => r.course_id);
  },

  isEnrolled: async (studentId, courseId) => {
    const { rows } = await pool.query(
      `SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2;`,
      [studentId, courseId]
    );
    return !!rows[0];
  },

  create: async (studentId, courseId) => {
    const { rows } = await pool.query(
      `INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2)
       RETURNING id, student_id, course_id, enrolled_at;`,
      [studentId, courseId]
    );
    return rows[0];
  },

  remove: async (studentId, courseId) => {
    await pool.query(`DELETE FROM enrollments WHERE student_id = $1 AND course_id = $2;`, [studentId, courseId]);
    // Al salirse del curso, también se borra el progreso (submissions) de ese curso.
    await pool.query(`DELETE FROM submissions WHERE student_id = $1 AND course_id = $2;`, [studentId, courseId]);
    return true;
  },

  findStudentsForCourse: async (courseId) => {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM enrollments e
       JOIN users u ON u.id = e.student_id
       WHERE e.course_id = $1
       ORDER BY u.full_name ASC;`,
      [courseId]
    );
    return rows;
  },
};
