// ─── Content Service ──────────────────────────────────────────────────────────
// Only gateway to content blocks. Views ONLY talk to this.
// Fully wired to the backend: content blocks live in the `items` table
// (tipo_item = 'content') in PostgreSQL.

import { api } from "../helpers/api.js";

// Valid types (same as the API)
export const CONTENT_TYPES = {
  README: "readme",
  YOUTUBE: "youtube",
  CANVA: "canva",
};

// ── Reading ───────────────────────────────────────────────────────────────────

// GET /api/sections/:sectionId/contents
export async function getContentsBySection(sectionId) {
  const data = await api.get(`/sections/${sectionId}/contents`);
  return [...data].sort((a, b) => a.orden - b.orden);
}

// ── Writing (tutor-owner only, validated server-side) ─────────────────────────

// POST /api/sections/:sectionId/contents
export async function createContent(sectionId, content) {
  return api.post(`/sections/${sectionId}/contents`, {
    titulo: content.titulo || "",
    tipo: content.tipo,
    datos: content.datos || "",
  });
}

// PUT /api/contents/:id
export async function updateContent(id, patch) {
  return api.put(`/contents/${id}`, patch);
}

// DELETE /api/contents/:id
export async function deleteContent(sectionId, id) {
  await api.del(`/contents/${id}`);
  return true;
}

// ── Contract utilities ────────────────────────────────────────────────────────

// Normalizes YouTube URL/ID to a pure ID (backend can send any)
export function youtubeId(datos = "") {
  const match = datos.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return match ? match[1] : datos.trim();
}

// Validates that a content block fulfills the contract before sending it
export function isValidContent(c) {
  return (
    c &&
    typeof c.tipo === "string" &&
    Object.values(CONTENT_TYPES).includes(c.tipo) &&
    typeof c.datos === "string"
  );
}
