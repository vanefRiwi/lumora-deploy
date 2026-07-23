// ─── MOCK: Content ─────────────────────────────────────────────────────────
// Format IDENTICAL to what the REST API will return.
// When the backend is ready, this file is deleted and NOTHING ELSE changes.
//
// Contract agreed upon with the backend:
//   GET /api/sections/:id/contents  ->  Content[]
//
//   Content = {
//     id:     number
//     title: string
//     type:   “readme” | ‘youtube’ | “canva”
//     data:  string    // Markdown | YouTube ID/URL | Canva embed URL
//     order:  number    // order of appearance within the section
//   }

export const MOCK_CONTENTS = {
  // key = section_id
  1: [
    {
      id: 1,
      titulo: "Introducción",
      tipo: "readme",
      datos: "## Key Concepts\n\nIn this section we explore the ideas that underpin the course.\n\n- **Abstraction** simplifies complex systems\n- **Modularity** keeps code maintainable\n- **Iteration** drives continuous improvement",
      orden: 1,
    },
    {
      id: 2,
      titulo: "Video de bienvenida",
      tipo: "youtube",
      datos: "dQw4w9WgXcQ",
      orden: 2,
    },
    {
      id: 3,
      titulo: "Presentación del módulo",
      tipo: "canva",
      datos: "https://www.canva.com/design/DAHMOD8pb74/tAhkFwGeNUV9ScjIbDToyg/view?embed",
      orden: 3,
    },
  ],
  2: [
    {
      id: 4,
      titulo: "Conceptos avanzados",
      tipo: "readme",
      datos: "### Why this matters\n\nUnderstanding these principles helps you build more **robust** and scalable solutions.",
      orden: 1,
    },
  ],
};
