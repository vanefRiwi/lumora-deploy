// ─── Prompt Modal ─────────────────────────────────────────────────────────────
// Replaces window.prompt(). Returns Promise<string|null>.

const closeIcon = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

export function promptModal({
  title,
  message = "",
  value = "",
  placeholder = "",
  confirmText = "Save",
  cancelText = "Cancel",
} = {}) {
  return new Promise((resolve) => {
    document.querySelector(".js-prompt-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.className = "js-prompt-overlay fixed inset-0 z-[200] flex items-center justify-center p-4";
    overlay.style.cssText = "background: rgba(0,0,0,.45); opacity: 0; transition: opacity .2s ease;";

    overlay.innerHTML = `
      <div class="js-prompt-box w-full max-w-md rounded-2xl p-6 shadow-2xl"
           style="background: var(--card); transform: scale(.96); transition: transform .2s ease;
                  font-family: var(--font-family-body)">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="text-base font-bold mb-1" style="font-family: var(--font-family-display)">${title}</h3>
            ${message ? `<p class="text-sm" style="color: var(--muted-foreground)">${message}</p>` : ""}
          </div>
          <button class="js-prompt-x shrink-0 cursor-pointer" style="color: var(--muted-foreground)">${closeIcon}</button>
        </div>

        <input class="js-prompt-input w-full px-4 py-3 rounded-xl text-sm outline-none mb-5"
               style="background: var(--muted); border: 1px solid var(--border)"
               value="${value}" placeholder="${placeholder}" />

        <div class="flex gap-3 justify-end">
          <button class="js-prompt-cancel px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style="border: 1px solid var(--border); color: var(--muted-foreground)">${cancelText}</button>
          <button class="js-prompt-ok px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style="background: var(--primary)">${confirmText}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    const input = overlay.querySelector(".js-prompt-input");

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      overlay.querySelector(".js-prompt-box").style.transform = "scale(1)";
      input.focus();
      input.select();
    });

    const close = (result) => {
      overlay.style.opacity = "0";
      overlay.querySelector(".js-prompt-box").style.transform = "scale(.96)";
      document.removeEventListener("keydown", onKey);
      setTimeout(() => { overlay.remove(); resolve(result); }, 180);
    };

    const onKey = (e) => {
      if (e.key === "Escape") close(null);
      if (e.key === "Enter") close(input.value.trim() || null);
    };
    document.addEventListener("keydown", onKey);

    overlay.querySelector(".js-prompt-ok").addEventListener("click", () => close(input.value.trim() || null));
    overlay.querySelector(".js-prompt-cancel").addEventListener("click", () => close(null));
    overlay.querySelector(".js-prompt-x").addEventListener("click", () => close(null));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(null); });
  });
}
