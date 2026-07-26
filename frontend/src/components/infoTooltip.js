// ─── Info tooltip ─────────────────────────────────────────────────────────────
// Small "i" bubble that reveals a hint on hover (desktop) or on tap (mobile).
// Hover is pure CSS; touch needs JS, because there is no hover on mobile and
// iOS Safari never focuses a <button> on tap, so :focus-within never fires.
//
// Usage:
//   import { infoTooltip, bindInfoTooltips } from "../infoTooltip.js";
//   `<label>Canva embed link ${infoTooltip("Your hint here")}</label>`
//   `${infoTooltip("Add ?embed at the end", { highlight: "?embed" })}`
//   ...and call bindInfoTooltips(root) after every render.

const infoIcon = `<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;

// The hint is plain text, so it is escaped before being injected.
function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// `place` defaults to "top": inside a form a downward tooltip would cover the
// field below, and a card with overflow-hidden could clip it.
// `align` is the horizontal anchor when the bubble is sized by content.
// `full` is the safe option for form fields: the bubble spans the whole width
// of its parent instead of hanging off a 16px icon, so it can never overflow
// the screen. It requires the parent element to carry `relative`.
// `highlight` paints one literal fragment of the hint in the primary color.
export function infoTooltip(
  text,
  { place = "top", align = "left", highlight = "", full = false } = {}
) {
  const pos = place === "bottom" ? "top-full mt-2" : "bottom-full mb-2";
  // In full mode the bubble stretches between both edges of the parent.
  const side = full ? "left-0 right-0" : (align === "right" ? "right-0" : "left-0");
  const width = full ? "" : "w-56 max-w-[calc(100vw-4rem)]";

  // Escape first, then colorize: the highlight is matched against the already
  // escaped text, so it can never be used to inject markup.
  let body = esc(text);
  if (highlight) {
    const needle = esc(highlight);
    body = body.split(needle).join(
      `<strong class="font-semibold" style="color: var(--primary)">${needle}</strong>`
    );
  }

  return `
    <span class="js-info group/info ${full ? "" : "relative"} inline-flex align-middle ml-1">
      <button type="button" data-info aria-label="More information"
        class="flex items-center justify-center w-4 h-4 rounded-full transition-all
               hover:scale-110 focus:outline-none focus-visible:ring-2"
        style="background: var(--secondary); color: var(--primary)">${infoIcon}</button>

      <span role="tooltip"
        class="js-tip pointer-events-none absolute ${pos} ${side} ${width} z-30
               p-2.5 rounded-lg text-[11px] font-normal leading-relaxed text-left normal-case
               opacity-0 invisible translate-y-1
               transition-all duration-200 ease-out
               group-hover/info:opacity-100 group-hover/info:visible group-hover/info:translate-y-0"
        style="background: color-mix(in srgb, var(--card) 90%, transparent);
               backdrop-filter: blur(10px);
               -webkit-backdrop-filter: blur(10px);
               border: 1px solid var(--border);
               color: var(--foreground);
               box-shadow: 0 8px 24px rgba(15, 31, 15, 0.14)">${body}</span>
    </span>`;
}

function closeAllInfo() {
  document.querySelectorAll(".js-info .js-tip").forEach((tip) => {
    tip.style.opacity = "";
    tip.style.visibility = "";
    tip.style.transform = "";
  });
}

// Registered once for the whole app: tapping anywhere else closes the tooltip.
if (!window.__lumoraInfoTooltipBound) {
  window.__lumoraInfoTooltipBound = true;
  document.addEventListener("click", closeAllInfo);
}

// Must be called after every render that produces tooltips.
export function bindInfoTooltips(root = document) {
  root.querySelectorAll(".js-info").forEach((wrapper) => {
    const btn = wrapper.querySelector("[data-info]");
    const tip = wrapper.querySelector(".js-tip");
    if (!btn || !tip) return;

    // attachEvents runs again on every rerender, so without this guard the
    // listeners would stack up and cancel each other out.
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", (e) => {
      // Must not reach whatever sits underneath.
      e.stopPropagation();
      e.preventDefault();

      const wasOpen = tip.style.visibility === "visible";
      closeAllInfo();
      if (!wasOpen) {
        tip.style.opacity = "1";
        tip.style.visibility = "visible";
        tip.style.transform = "translateY(0)";
      }
    });
  });
}
