import { pool } from "../../config/postgres/postgres.db.js";

export const submissionRepository = {
  findForSection: async (studentId, sectionId, itemType) => {
    const { rows } = await pool.query(
      `SELECT * FROM submissions WHERE student_id = $1 AND section_id = $2 AND item_type = $3;`,
      [studentId, sectionId, itemType]
    );
    return rows[0] || null;
  },

  findFinal: async (studentId, courseId) => {
    const { rows } = await pool.query(
      `SELECT * FROM submissions WHERE student_id = $1 AND course_id = $2 AND item_type = 'final';`,
      [studentId, courseId]
    );
    return rows[0] || null;
  },

  upsertSection: async ({ studentId, courseId, sectionId, itemType, answers, score, total, points, correct }) => {
    const existing = await submissionRepository.findForSection(studentId, sectionId, itemType);
    if (existing) {
      const { rows } = await pool.query(
        `UPDATE submissions
         SET answers = $1, score = $2, total = $3, points = $4, correct = $5, updated_at = NOW()
         WHERE id = $6 RETURNING *;`,
        [answers, score, total, points, correct, existing.id]
      );
      return rows[0];
    }
    const { rows } = await pool.query(
      `INSERT INTO submissions (student_id, course_id, section_id, item_type, answers, score, total, points, correct)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;`,
      [studentId, courseId, sectionId, itemType, answers, score, total, points, correct]
    );
    return rows[0];
  },

  upsertFinal: async ({ studentId, courseId, answers, score, total, points }) => {
    const existing = await submissionRepository.findFinal(studentId, courseId);
    if (existing) {
      const { rows } = await pool.query(
        `UPDATE submissions
         SET answers = $1, score = $2, total = $3, points = $4, updated_at = NOW()
         WHERE id = $5 RETURNING *;`,
        [answers, score, total, points, existing.id]
      );
      return rows[0];
    }
    const { rows } = await pool.query(
      `INSERT INTO submissions (student_id, course_id, section_id, item_type, answers, score, total, points)
       VALUES ($1, $2, NULL, 'final', $3, $4, $5, $6) RETURNING *;`,
      [studentId, courseId, answers, score, total, points]
    );
    return rows[0];
  },

  findAllForStudentInCourse: async (studentId, courseId) => {
    const { rows } = await pool.query(
      `SELECT * FROM submissions WHERE student_id = $1 AND course_id = $2;`,
      [studentId, courseId]
    );
    return rows;
  },

  findAllForCourse: async (courseId) => {
    const { rows } = await pool.query(`SELECT * FROM submissions WHERE course_id = $1;`, [courseId]);
    return rows;
  },
};
