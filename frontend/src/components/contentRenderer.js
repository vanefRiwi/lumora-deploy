// ─── Content Renderer ─────────────────────────────────────────────────────────
// AUTOMATICALLY decides which component to render based on content.tipo.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  DATA CONTRACT (identical to the API)                                   │
// │                                                                         │
// │  { id, titulo, tipo, datos, orden }                                     │
// │                                                                         │
// │  The `tipo` field indicates HOW to interpret the `datos` field:         │
// │                                                                         │
// │   tipo = "readme"   ->  datos = text in MARKDOWN                        │
// │                         ex: "## Title\n\n- **Key** point"               │
// │                                                                         │
// │   tipo = "youtube"  ->  datos = video ID or URL                         │
// │                         ex: "dQw4w9WgXcQ"                               │
// │                         ex: "https://youtube.com/watch?v=dQw4w9WgXcQ"   │
// │                                                                         │
// │   tipo = "canva"    ->  datos = EMBED URL of the design                 │
// │                         ex: "https://canva.com/design/XXX/view?embed"   │
// │                                                                         │
// │  Always a SINGLE `datos` field. Never separate `url` or `md`.           │
// └─────────────────────────────────────────────────────────────────────────┘
//
// To support a new type, just add it to the RENDERERS map.
// No view changes needed. (Open/closed principle.)

import { marked } from "marked";
import DOMPurify from "dompurify";
import { CONTENT_TYPES, youtubeId } from "../services/contentService.js";

// Configuration for marked: GitHub-style line breaks
marked.setOptions({ breaks: true, gfm: true });

// Common wrapper for all content cards
function card(titulo, inner, { padded = true } = {}) {
  return `
    <div class="rounded-xl overflow-hidden" style="background: var(--card); border: 1px solid var(--border)">
      ${titulo ? `<p class="px-5 pt-4 pb-1 font-bold text-sm" style="font-family: var(--font-family-display)">${titulo}</p>` : ""}
      <div class="${padded ? "px-5 pb-5 pt-2" : "p-4"}">${inner}</div>
    </div>`;
}

// ── type: "readme" -> datos = Markdown ──────────────────────────────────────
function renderReadme(content) {
  // marked converts Markdown -> HTML.
  // DOMPurify sanitizes HTML to prevent XSS (a tutor could inject <script>).
  const dirty = marked.parse(content.datos || "");
  const clean = DOMPurify.sanitize(dirty);

  return card(
    content.titulo,
    `<div class="markdown-body text-sm leading-relaxed">${clean}</div>`
  );
}

// ── type: "youtube" -> datos = video ID or URL ────────────────────────────────
function renderYoutube(content) {
  const id = youtubeId(content.datos);   // normalizes any format to an ID

  return card(
    content.titulo,
    `<div class="relative w-full rounded-lg overflow-hidden" style="padding-bottom:56.25%">
       <iframe class="absolute inset-0 w-full h-full"
         src="https://www.youtube.com/embed/${id}"
         title="${content.titulo || "Video"}"
         frameborder="0" allowfullscreen loading="lazy"
         allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"></iframe>
     </div>`,
    { padded: false }
  );
}

// ── type: "canva" -> datos = embed URL ──────────────────────────────────────
function renderCanva(content) {
  return card(
    content.titulo,
    `<div class="relative w-full rounded-lg overflow-hidden" style="padding-bottom:56.25%">
       <iframe class="absolute inset-0 w-full h-full"
         src="${content.datos}"
         title="${content.titulo || "Canva design"}"
         frameborder="0" allowfullscreen loading="lazy"></iframe>
     </div>`,
    { padded: false }
  );
}

// ── Fallback: unknown type (doesn't break the view) ──────────────────────────
function renderUnknown(content) {
  return `
    <div class="rounded-xl p-4 text-sm" style="background: var(--muted); color: var(--muted-foreground)">
      Unsupported content type: <code>${content.tipo}</code>
    </div>`;
}

// ── Map: type -> renderer ────────────────────────────────────────────────────
const RENDERERS = {
  [CONTENT_TYPES.README]: renderReadme,
  [CONTENT_TYPES.YOUTUBE]: renderYoutube,
  [CONTENT_TYPES.CANVA]: renderCanva,
};

// Renders a SINGLE piece of content based on its type
export function renderContent(content) {
  const renderer = RENDERERS[content.tipo] || renderUnknown;
  return renderer(content);
}

// Renders a COMPLETE list, respecting the `orden` field
export function renderContentList(contents = []) {
  if (!contents.length) {
    return `<p class="text-sm py-8 text-center" style="color: var(--muted-foreground)">No content yet.</p>`;
  }
  return contents
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((c) => `<div class="mb-4">${renderContent(c)}</div>`)
    .join("");
}
