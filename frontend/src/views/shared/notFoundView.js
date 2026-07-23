// ─── 404 — Not Found ──────────────────────────────────────────────────────────
// Displayed when the URL does not match any registered route.

import { getSession } from "../../helpers/auth.js";
import { navigate } from "../../router/router.js";

const icon = {
  search: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>`,
  home: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  back: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
};

export function notFoundView() {
  const session = getSession();
  const homePath = !session ? "/login" : session.role === "tutor" ? "/tutor" : "/student";
  const homeLabel = !session ? "Go to login" : "Back to home";

  return `
    <div class="min-h-screen flex items-center justify-center p-6"
         style="background: var(--background); font-family: var(--font-family-body)">
      <div class="text-center max-w-md">

        <div class="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
             style="background: var(--secondary); color: var(--primary)">${icon.search}</div>

        <p class="text-6xl font-bold mb-2" style="font-family: var(--font-family-display); color: var(--primary)">404</p>
        <h1 class="text-xl font-bold mb-2" style="font-family: var(--font-family-display)">Page not found</h1>
        <p class="text-sm mb-8 leading-relaxed" style="color: var(--muted-foreground)">
          The page you're looking for doesn't exist or may have been moved.
          Check the URL or head back to safety.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button class="js-home flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
                  style="background: var(--primary)">${icon.home} ${homeLabel}</button>
          <button class="js-back flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                  style="border: 1px solid var(--border); color: var(--muted-foreground)">${icon.back} Go back</button>
        </div>
      </div>
    </div>`;
}

export function initNotFound() {
  const root = document.getElementById("app");
  const session = getSession();
  const homePath = !session ? "/login" : session.role === "tutor" ? "/tutor" : "/student";

  root.querySelector(".js-home").addEventListener("click", () => navigate(homePath));
  root.querySelector(".js-back").addEventListener("click", () => history.back());
}
