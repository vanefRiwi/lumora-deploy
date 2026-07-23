// ─── 403 — Not Authorized ─────────────────────────────────────────────────────
// Displayed when a user attempts to access a path that does NOT correspond
// to their role (e.g., a student opening /tutor/editor, or vice versa).
//
// Distinguishes between two cases:
//   - Not logged in        -> prompts the user to log in.
//   - Incorrect role    -> explains that their account does not have access and
//                          offers to return to THEIR home page (the one for their role).


import { getSession, logout } from "../../helpers/auth.js";
import { navigate } from "../../router/router.js";

const icon = {
  shield: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-5 5"/><path d="m9.5 9.5 5 5"/></svg>`,
  home: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  logout: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  login: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>`,
};

export function notAuthorizedView() {
  const session = getSession();
  const roleLabel = session?.role === "tutor" ? "Tutor" : "Student";

  // No session: You must log in
  const noSession = `
    <p class="text-sm mb-8 leading-relaxed" style="color: var(--muted-foreground)">
      You need to sign in to access this page.
    </p>
    <button class="js-login flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer mx-auto"
            style="background: var(--primary)">${icon.login} Sign in</button>`;

  // Logged in but with the wrong role
  const wrongRole = `
    <p class="text-sm mb-2 leading-relaxed" style="color: var(--muted-foreground)">
      Your account doesn't have permission to view this page.
    </p>
    <p class="text-xs mb-8">
      <span style="color: var(--muted-foreground)">You're signed in as </span>
      <span class="font-semibold px-2 py-0.5 rounded-full"
            style="background: var(--secondary); color: var(--primary)">${session?.full_name || "user"} · ${roleLabel}</span>
    </p>

    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <button class="js-home flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
              style="background: var(--primary)">${icon.home} Back to my home</button>
      <button class="js-switch flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style="border: 1px solid var(--border); color: var(--muted-foreground)">${icon.logout} Switch account</button>
    </div>`;

  return `
    <div class="min-h-screen flex items-center justify-center p-6"
         style="background: var(--background); font-family: var(--font-family-body)">
      <div class="text-center max-w-md">

        <div class="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
             style="background: #fee2e2; color: #dc2626">${icon.shield}</div>

        <p class="text-6xl font-bold mb-2" style="font-family: var(--font-family-display); color: #dc2626">403</p>
        <h1 class="text-xl font-bold mb-3" style="font-family: var(--font-family-display)">Access denied</h1>

        ${session ? wrongRole : noSession}
      </div>
    </div>`;
}

export function initNotAuthorized() {
  const root = document.getElementById("app");
  const session = getSession();

  // Return to the home page that DOES correspond to your role
  root.querySelector(".js-home")?.addEventListener("click", () => {
    navigate(session?.role === "tutor" ? "/tutor" : "/student");
  });

  // Switch accounts: logs out and goes to the login page
  root.querySelector(".js-switch")?.addEventListener("click", () => {
    logout();
    navigate("/login");
  });

  root.querySelector(".js-login")?.addEventListener("click", () => navigate("/login"));
}
