import bcrypt from "bcryptjs";
import { pool } from "./postgres.db.js";

/**
 * 🏗️ Lumora's complete scheme.
 * It runs in every boot (CREATE TABLE IF NOT EXISTS is idempotent),
 * so there's no need to run migrations manually to have everything MVP up.
 */
export const ensureSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'tutor')),
        learning_goal VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        instructor VARCHAR(150),
        category VARCHAR(100),
        level VARCHAR(30) NOT NULL DEFAULT 'Beginner',
        description TEXT,
        image TEXT,
        visibility VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (visibility IN ('open', 'code')),
        course_code VARCHAR(20) UNIQUE,
        base_students INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        orden INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // items covers: welcome, content (blocks), review and quizz (per section)
    // and also the "final" (per course, section_id = NULL).
    await client.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        tipo_item VARCHAR(20) NOT NULL CHECK (tipo_item IN ('welcome', 'content', 'review', 'quizz', 'final')),
        titulo VARCHAR(200),
        tipo VARCHAR(20),
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        points INTEGER NOT NULL DEFAULT 0,
        orden INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT items_owner_check CHECK (section_id IS NOT NULL OR course_id IS NOT NULL)
      );
    `);

    // welcome/review/quizz: a single record per section.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_items_section_single
      ON items (section_id, tipo_item)
      WHERE tipo_item IN ('welcome', 'review', 'quizz');
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (student_id, course_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
        item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('quizz', 'review', 'final')),
        answers JSONB,
        score INTEGER,
        total INTEGER,
        points INTEGER NOT NULL DEFAULT 0,
        correct BOOLEAN,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // A single submission per student+section for quizz/review (manual upsert in the repo).
    // This is to ensure that a student can only submit once per section for quizz/review.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_submissions_section
      ON submissions (student_id, section_id, item_type)
      WHERE section_id IS NOT NULL;
    `);

    // A "final" submission per student+course (section_id is NULL in that case).
    // This is to ensure that a student can only submit the final once per course.
    // The "final" submission is the one that counts for the course completion.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_submissions_final
      ON submissions (student_id, course_id)
      WHERE item_type = 'final';
    `);

    await client.query("COMMIT");
    console.log("🏗️  [Database]: Schema verified/created successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // Seed demo users (idempotent). Runs on the pool, NOT on the released client:
  // querying a client after release() corrupts the pool and crashed the boot.
  const testPassword = await bcrypt.hash("password123", 10);
  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, learning_goal)
     VALUES
      ('Alex Rivera', 'alex.rivera@lumora.com', $1, 'tutor', 'Teaching'),
      ('Jordan Kim', 'jordan.kim@lumora.com', $1, 'student', 'Career change')
     ON CONFLICT (email) DO NOTHING;`,
    [testPassword]
  );
};