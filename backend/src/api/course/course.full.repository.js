import { pool } from "../../config/postgres/postgres.db.js";

/**
 * Sync repository for the course editor's "Save Course" payload.
 *
 * The frontend editor saves the WHOLE course in one shot:
 *   { sections: [{ id, title }], items: { [sectionId]: { welcome, content, review, quizz } }, finalAssessment }
 *
 * New sections arrive with temporary ids (Date.now()), existing ones keep their
 * DB id. Everything runs inside ONE transaction so a mid-save failure never
 * leaves the course half-written.
 */
export const courseFullRepository = {
  /**
   * Replaces the sections + items of a course with the given payload.
   * Returns idMap: { [payloadSectionId]: dbSectionId } so the caller can
   * remap the `items` keys of newly created sections.
   */
  syncContent: async (courseId, { sections = [], items = {}, finalAssessment = null }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // ── 1. Sections: update existing, insert new, delete removed ──
      const { rows: existingRows } = await client.query(
        `SELECT id FROM sections WHERE course_id = $1;`,
        [courseId]
      );
      const existingIds = new Set(existingRows.map((r) => r.id));

      const idMap = {};
      const keptIds = [];

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const payloadId = Number(sec.id);

        if (existingIds.has(payloadId)) {
          await client.query(
            `UPDATE sections SET title = $1, orden = $2 WHERE id = $3 AND course_id = $4;`,
            [sec.title || `Section ${i + 1}`, i + 1, payloadId, courseId]
          );
          idMap[payloadId] = payloadId;
          keptIds.push(payloadId);
        } else {
          const { rows } = await client.query(
            `INSERT INTO sections (course_id, title, orden) VALUES ($1, $2, $3) RETURNING id;`,
            [courseId, sec.title || `Section ${i + 1}`, i + 1]
          );
          idMap[payloadId] = rows[0].id;
          keptIds.push(rows[0].id);
        }
      }

      // Sections removed in the editor disappear (items + submissions cascade).
      if (keptIds.length) {
        await client.query(
          `DELETE FROM sections WHERE course_id = $1 AND NOT (id = ANY($2::int[]));`,
          [courseId, keptIds]
        );
      } else {
        await client.query(`DELETE FROM sections WHERE course_id = $1;`, [courseId]);
      }

      // ── 2. Items per section: wipe and re-insert (safe: single transaction) ──
      for (const sec of sections) {
        const dbId = idMap[Number(sec.id)];
        const secItems = items[sec.id] || items[String(sec.id)] || {};

        await client.query(`DELETE FROM items WHERE section_id = $1;`, [dbId]);

        // welcome (always stored, even empty, to keep the aggregate simple)
        const welcome = secItems.welcome || { message: "", videoUrl: "" };
        await client.query(
          `INSERT INTO items (section_id, tipo_item, payload, points, orden)
           VALUES ($1, 'welcome', $2, 0, 1);`,
          [dbId, JSON.stringify({ message: welcome.message || "", videoUrl: welcome.videoUrl || "" })]
        );

        // review (practice activity, no points)
        if (secItems.review) {
          const { points: _p, ...reviewPayload } = secItems.review;
          await client.query(
            `INSERT INTO items (section_id, tipo_item, payload, points, orden)
             VALUES ($1, 'review', $2, 0, 1);`,
            [dbId, JSON.stringify(reviewPayload)]
          );
        }

        // quizz (only if it has questions)
        const quizz = secItems.quizz;
        if (quizz?.questions?.length) {
          await client.query(
            `INSERT INTO items (section_id, tipo_item, payload, points, orden)
             VALUES ($1, 'quizz', $2, $3, 1);`,
            [dbId, JSON.stringify({ questions: quizz.questions, countsGrade: quizz.countsGrade !== false }), quizz.points || 50]
          );
        }

        // content blocks, in order
        const blocks = secItems.content || [];
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          await client.query(
            `INSERT INTO items (section_id, tipo_item, titulo, tipo, payload, orden)
             VALUES ($1, 'content', $2, $3, $4, $5);`,
            [dbId, b.titulo || "", b.tipo, JSON.stringify({ datos: b.datos || "" }), i + 1]
          );
        }
      }

      // ── 3. Final assessment (per course, section_id = NULL) ──
      await client.query(
        `DELETE FROM items WHERE course_id = $1 AND tipo_item = 'final';`,
        [courseId]
      );
      if (finalAssessment?.questions?.length) {
        await client.query(
          `INSERT INTO items (course_id, tipo_item, payload, points, orden)
           VALUES ($1, 'final', $2, $3, 1);`,
          [
            courseId,
            JSON.stringify({ questions: finalAssessment.questions, countsGrade: finalAssessment.countsGrade !== false }),
            finalAssessment.points || 200,
          ]
        );
      }

      await client.query("COMMIT");
      return idMap;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
