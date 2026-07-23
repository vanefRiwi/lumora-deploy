import { pool } from "../config/postgres/postgres.db.js";

/**
 * Generic helper for data access, reused by the repositories.
 * This is to avoid repeating the pool import in every module.
 */
export const db = {
  query: (text, params) => pool.query(text, params),

  /**
   * Runs a function inside a transaction (BEGIN/COMMIT/ROLLBACK).
   * Useful for operations that touch multiple tables at once.
   */
  transaction: async (fn) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
