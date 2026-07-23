import { pool } from "../../config/postgres/postgres.db.js";

const COURSE_COLUMNS = `
  id, tutor_id, title, instructor, category, level, description, image,
  visibility, course_code, base_students, created_at
`;

export const courseRepository = {
  /**
   * All courses + real count of enrolled students (enrollments) + if the current
   * user is signed up (to be able to mark "Joined" without a separate query).
   */
  findAllWithStats: async (userId) => {
    const { rows } = await pool.query(
      `SELECT c.*,
              (c.base_students + COUNT(e.id))::int AS students,
              BOOL_OR(e.student_id = $1) AS is_enrolled
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC;`,
      [userId || 0]
    );
    return rows;
  },

  findByTutor: async (tutorId) => {
    const { rows } = await pool.query(
      `SELECT c.*, (c.base_students + COUNT(e.id))::int AS students
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       WHERE c.tutor_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC;`,
      [tutorId]
    );
    return rows;
  },

  findById: async (id) => {
    const { rows } = await pool.query(`SELECT ${COURSE_COLUMNS} FROM courses WHERE id = $1;`, [id]);
    return rows[0] || null;
  },

  findByCode: async (code) => {
    const { rows } = await pool.query(`SELECT ${COURSE_COLUMNS} FROM courses WHERE course_code = $1;`, [code]);
    return rows[0] || null;
  },

  create: async ({ tutor_id, title, instructor, category, level, description, image, visibility, course_code }) => {
    const { rows } = await pool.query(
      `INSERT INTO courses (tutor_id, title, instructor, category, level, description, image, visibility, course_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${COURSE_COLUMNS};`,
      [tutor_id, title, instructor, category, level || "Beginner", description, image, visibility || "open", course_code]
    );
    return rows[0];
  },

  update: async (id, fields) => {
    const { title, instructor, category, level, description, image, visibility, course_code } = fields;
    const { rows } = await pool.query(
      `UPDATE courses
       SET title = $1, instructor = $2, category = $3, level = $4, description = $5,
           image = $6, visibility = $7, course_code = $8
       WHERE id = $9
       RETURNING ${COURSE_COLUMNS};`,
      [title, instructor, category, level, description, image, visibility, course_code, id]
    );
    return rows[0] || null;
  },

  // Stats globales de los cursos de un tutor (para su dashboard).
  // ⚠️ Subqueries independientes: un doble LEFT JOIN (enrollments × sections)
  // multiplicaba las filas e inflaba los conteos.
  statsForTutor: async (tutorId) => {
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM courses WHERE tutor_id = $1)::int AS total_courses,
         COALESCE((SELECT SUM(base_students) FROM courses WHERE tutor_id = $1), 0)::int
           + (SELECT COUNT(*) FROM enrollments e
              JOIN courses c ON c.id = e.course_id
              WHERE c.tutor_id = $1)::int AS total_students,
         (SELECT COUNT(*) FROM sections s
          JOIN courses c ON c.id = s.course_id
          WHERE c.tutor_id = $1)::int AS total_sections;`,
      [tutorId]
    );
    return rows[0];
  },
};
