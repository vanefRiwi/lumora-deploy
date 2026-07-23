// ─── Confirm Modal ────────────────────────────────────────────────────────────
// Replaces window.confirm() with a modal matching the design.
// Usage: const ok = await confirmModal({ title, message, confirmText, danger });

const icon = {
  warning: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  close: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
};

export function confirmModal({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    document.querySelector(".js-confirm-overlay")?.remove();

    const confirmBg = danger ? "#dc2626" : "var(--primary)";
    const iconBg = danger ? "#fee2e2" : "var(--secondary)";
    const iconFg = danger ? "#dc2626" : "var(--primary)";

    const overlay = document.createElement("div");
    overlay.className = "js-confirm-overlay fixed inset-0 z-[200] flex items-center justify-center p-4";
    overlay.style.cssText = "background: rgba(0,0,0,.45); opacity: 0; transition: opacity .2s ease;";

    overlay.innerHTML = `
      <div class="js-confirm-box w-full max-w-md rounded-2xl p-6 shadow-2xl"
           style="background: var(--card); transform: scale(.96); transition: transform .2s ease;
                  font-family: var(--font-family-body)">
        <div class="flex items-start gap-4 mb-5">
          <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
               style="background: ${iconBg}; color: ${iconFg}">${icon.warning}</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-bold mb-1" style="font-family: var(--font-family-display)">${title}</h3>
            <p class="text-sm leading-relaxed" style="color: var(--muted-foreground)">${message}</p>
          </div>
          <button class="js-confirm-x shrink-0 cursor-pointer" style="color: var(--muted-foreground)">${icon.close}</button>
        </div>
        <div class="flex gap-3 justify-end">
          <button class="js-confirm-cancel px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style="border: 1px solid var(--border); color: var(--muted-foreground)">${cancelText}</button>
          <button class="js-confirm-ok px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style="background: ${confirmBg}">${confirmText}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      overlay.querySelector(".js-confirm-box").style.transform = "scale(1)";
    });

    const close = (result) => {
      overlay.style.opacity = "0";
      overlay.querySelector(".js-confirm-box").style.transform = "scale(.96)";
      document.removeEventListener("keydown", onKey);
      setTimeout(() => { overlay.remove(); resolve(result); }, 180);
    };

    // Escape = cancel · Enter = confirm
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    document.addEventListener("keydown", onKey);

    overlay.querySelector(".js-confirm-ok").addEventListener("click", () => close(true));
    overlay.querySelector(".js-confirm-cancel").addEventListener("click", () => close(false));
    overlay.querySelector(".js-confirm-x").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });

    overlay.querySelector(".js-confirm-ok").focus();
  });
}
