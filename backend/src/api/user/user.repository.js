import { pool } from "../../config/postgres/postgres.db.js";

export const userRepository = {
  findById: async (id) => {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, learning_goal, created_at FROM users WHERE id = $1;`,
      [id]
    );
    return rows[0] || null;
  },

  findByEmail: async (email) => {
    const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1;`, [email]);
    return rows[0] || null;
  },

  updateProfile: async (id, { full_name, email, learning_goal }) => {
    const { rows } = await pool.query(
      `UPDATE users
       SET full_name = $1, email = $2, learning_goal = $3
       WHERE id = $4
       RETURNING id, full_name, email, role, learning_goal, created_at;`,
      [full_name, email, learning_goal, id]
    );
    return rows[0] || null;
  },
};
