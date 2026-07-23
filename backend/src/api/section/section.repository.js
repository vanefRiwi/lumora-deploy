import { pool } from "../../config/postgres/postgres.db.js";

export const sectionRepository = {
  findByCourse: async (courseId) => {
    const { rows } = await pool.query(
      `SELECT id, course_id, title, orden FROM sections WHERE course_id = $1 ORDER BY orden ASC, id ASC;`,
      [courseId]
    );
    return rows;
  },

  findById: async (id) => {
    const { rows } = await pool.query(`SELECT id, course_id, title, orden FROM sections WHERE id = $1;`, [id]);
    return rows[0] || null;
  },

  create: async (courseId, { title, orden }) => {
    const { rows } = await pool.query(
      `INSERT INTO sections (course_id, title, orden) VALUES ($1, $2, $3)
       RETURNING id, course_id, title, orden;`,
      [courseId, title, orden]
    );
    return rows[0];
  },

  countByCourse: async (courseId) => {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM sections WHERE course_id = $1;`, [courseId]);
    return rows[0].count;
  },
};
