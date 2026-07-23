// ─── Toast ────────────────────────────────────────────────────────────────────
// Reusable Floating Notification(eg. "Course created successfully").

export function showToast(message, type = "success") {
  // Remove any previous toast
  document.querySelector(".js-toast")?.remove();

  const colors = {
    success: { bg: "var(--primary)", fg: "#fff" },
    error:   { bg: "#dc2626",        fg: "#fff" },
    info:    { bg: "var(--card)",    fg: "var(--foreground)" },
  };
  const c = colors[type] || colors.success;

  const el = document.createElement("div");
  el.className = "js-toast fixed z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold";
  el.style.cssText = `
    bottom: 5.5rem; left: 50%; transform: translateX(-50%) translateY(1rem);
    background: ${c.bg}; color: ${c.fg}; opacity: 0;
    transition: opacity .25s ease, transform .25s ease;
  `;
  el.textContent = message;
  document.body.appendChild(el);

  // Opening Animation
  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) translateY(0)";
  });

  // Start at 2.5 seconds
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) translateY(1rem)";
    setTimeout(() => el.remove(), 250);
  }, 2500);
}
