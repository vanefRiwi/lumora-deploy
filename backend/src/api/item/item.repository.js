import { pool } from "../../config/postgres/postgres.db.js";

export const itemRepository = {
  // ── welcome / review / quizz: un único registro por sección ──
  findSingle: async (sectionId, tipoItem) => {
    const { rows } = await pool.query(
      `SELECT id, section_id, tipo_item, payload, points FROM items
       WHERE section_id = $1 AND tipo_item = $2;`,
      [sectionId, tipoItem]
    );
    return rows[0] || null;
  },

  upsertSingle: async (sectionId, tipoItem, { payload, points }) => {
    const existing = await itemRepository.findSingle(sectionId, tipoItem);
    if (existing) {
      const { rows } = await pool.query(
        `UPDATE items SET payload = $1, points = $2 WHERE id = $3
         RETURNING id, section_id, tipo_item, payload, points;`,
        [payload, points || 0, existing.id]
      );
      return rows[0];
    }
    const { rows } = await pool.query(
      `INSERT INTO items (section_id, tipo_item, payload, points, orden)
       VALUES ($1, $2, $3, $4, 1)
       RETURNING id, section_id, tipo_item, payload, points;`,
      [sectionId, tipoItem, payload, points || 0]
    );
    return rows[0];
  },

  // ── final assessment: un único registro por curso ──
  findFinal: async (courseId) => {
    const { rows } = await pool.query(
      `SELECT id, course_id, payload, points FROM items WHERE course_id = $1 AND tipo_item = 'final';`,
      [courseId]
    );
    return rows[0] || null;
  },

  upsertFinal: async (courseId, { payload, points }) => {
    const existing = await itemRepository.findFinal(courseId);
    if (existing) {
      const { rows } = await pool.query(
        `UPDATE items SET payload = $1, points = $2 WHERE id = $3
         RETURNING id, course_id, payload, points;`,
        [payload, points || 0, existing.id]
      );
      return rows[0];
    }
    const { rows } = await pool.query(
      `INSERT INTO items (course_id, tipo_item, payload, points, orden)
       VALUES ($1, 'final', $2, $3, 1)
       RETURNING id, course_id, payload, points;`,
      [courseId, payload, points || 0]
    );
    return rows[0];
  },

  // ── content: múltiples bloques por sección, con CRUD propio ──
  findContents: async (sectionId) => {
    const { rows } = await pool.query(
      `SELECT id, section_id, titulo, tipo, payload, orden FROM items
       WHERE section_id = $1 AND tipo_item = 'content'
       ORDER BY orden ASC, id ASC;`,
      [sectionId]
    );
    return rows;
  },

  findContentById: async (id) => {
    const { rows } = await pool.query(
      `SELECT id, section_id, titulo, tipo, payload, orden FROM items WHERE id = $1 AND tipo_item = 'content';`,
      [id]
    );
    return rows[0] || null;
  },

  createContent: async (sectionId, { titulo, tipo, datos, orden }) => {
    const { rows } = await pool.query(
      `INSERT INTO items (section_id, tipo_item, titulo, tipo, payload, orden)
       VALUES ($1, 'content', $2, $3, $4, $5)
       RETURNING id, section_id, titulo, tipo, payload, orden;`,
      [sectionId, titulo || "", tipo, JSON.stringify({ datos: datos || "" }), orden]
    );
    return rows[0];
  },

  updateContent: async (id, patch) => {
    const existing = await itemRepository.findContentById(id);
    if (!existing) return null;

    const titulo = patch.titulo ?? existing.titulo;
    const tipo = patch.tipo ?? existing.tipo;
    const datos = patch.datos ?? existing.payload?.datos ?? "";

    const { rows } = await pool.query(
      `UPDATE items SET titulo = $1, tipo = $2, payload = $3 WHERE id = $4
       RETURNING id, section_id, titulo, tipo, payload, orden;`,
      [titulo, tipo, JSON.stringify({ datos }), id]
    );
    return rows[0];
  },

  deleteContent: async (id) => {
    const existing = await itemRepository.findContentById(id);
    if (!existing) return null;

    await pool.query(`DELETE FROM items WHERE id = $1;`, [id]);

    // Reordena lo que queda de esa sección para que `orden` sea consecutivo.
    const remaining = await itemRepository.findContents(existing.section_id);
    await Promise.all(
      remaining.map((c, i) =>
        pool.query(`UPDATE items SET orden = $1 WHERE id = $2;`, [i + 1, c.id])
      )
    );
    return existing;
  },

  countContents: async (sectionId) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM items WHERE section_id = $1 AND tipo_item = 'content';`,
      [sectionId]
    );
    return rows[0].count;
  },
};
