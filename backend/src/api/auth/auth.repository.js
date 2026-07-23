import { pool } from "../../config/postgres/postgres.db.js";

export const authRepository = {
  /**
   * Search user by email (for login and dupe validation)
   */
  findUserByEmail: async (email) => {
    const query = `
      SELECT id, full_name, email, password_hash, role, learning_goal 
      FROM users 
      WHERE email = $1;
    `;
    const { rows } = await pool.query(query, [email]);
    return rows.length > 0 ? rows[0] : null; // We return the user or null
  },

  /**
   * Create new user (for the signup endpoint)
   */
  createUser: async ({ fullName, email, passwordHash, role, learningGoal }) => {
    const query = `
      INSERT INTO users (full_name, email, password_hash, role, learning_goal)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, full_name, email, role, learning_goal, created_at;
    `;
    const values = [fullName, email, passwordHash, role, learningGoal];
    const { rows } = await pool.query(query, values);
    return rows[0]; // We return the new recently created user object.
  }
};