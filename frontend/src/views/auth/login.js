// ─── Login View ───────────────────────────────────────────────────────────────
// Replicates the Figma design in Vanilla JS (green panel + form).
// This is the only view implemented so far.

import { api } from "../../helpers/api.js";
import { saveSession } from "../../helpers/auth.js";
import { navigate } from "../../router/router.js";

// Local view state
let role = "student"; // "student" | "tutor"
let showPass = false;

// Inline SVG icons (equivalent to the Lucide icons used in the design)
const icon = {
  cap: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  book: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  users: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  check: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
  eye: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
};

const features = [
  { icon: icon.book, text: "Courses across all disciplines" },
  { icon: icon.users, text: "Directed to active learners worldwide" },
  { icon: icon.check, text: "Teach anything to your students" },
];

export function loginView() {
  return `
    <div class="min-h-screen flex" style="font-family: var(--font-family-body)">

      <!-- ── Panel izquierdo (verde) ── -->
      <div class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
           style="background: var(--primary)">
        <div class="relative z-10">
          <div class="flex items-center gap-2.5 mb-12">
            <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">${icon.cap}</div>
            <span class="text-xl font-bold text-white" style="font-family: var(--font-family-display)">Lumora</span>
          </div>
          <h2 class="text-4xl font-bold text-white leading-tight mb-4" style="font-family: var(--font-family-display)">Learn without<br/>limits.</h2>
          <p class="text-green-100 text-lg leading-relaxed max-w-sm">Access world-class courses taught by industry experts. Advance your career at your own pace.</p>
        </div>

        <div class="relative z-10 space-y-3">
          ${features.map((f) => `
            <div class="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <span class="text-green-200 shrink-0">${f.icon}</span>
              <span class="text-white text-sm">${f.text}</span>
            </div>`).join("")}
        </div>

        <!-- círculos decorativos -->
        <div class="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/5"></div>
        <div class="absolute -left-10 -bottom-16 w-60 h-60 rounded-full bg-white/5"></div>
        <div class="absolute right-16 bottom-32 w-24 h-24 rounded-full bg-white/10"></div>
      </div>

      <!-- ── Panel derecho (formulario) ── -->
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="w-full max-w-md">
          <!-- logo visible solo en móvil -->
          <div class="lg:hidden flex items-center gap-2.5 mb-8">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white" style="background: var(--primary)">${icon.cap}</div>
            <span class="text-xl font-bold" style="font-family: var(--font-family-display)">Lumora</span>
          </div>

          <h1 class="text-2xl font-bold mb-1" style="font-family: var(--font-family-display)">Welcome back</h1>
          <p class="mb-8 text-sm" style="color: var(--muted-foreground)">Sign in to your account to continue learning.</p>

          <!-- Tabs Student / Tutor -->

          <!-- Formulario -->
          <form class="js-login-form space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1.5">Email address</label>
              <input name="email" type="email" required placeholder="you@example.com"
                class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style="background: var(--muted); border: 1px solid var(--border)" />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm font-medium">Password</label>
                <button type="button" class="text-xs font-medium" style="color: var(--primary)">Forgot password?</button>
              </div>
              <div class="relative">
                <input name="password" type="password" required placeholder="Enter your password"
                  class="js-password w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
                  style="background: var(--muted); border: 1px solid var(--border)" />
                <button type="button" class="js-toggle-pass absolute right-3.5 top-1/2 -translate-y-1/2"
                  style="color: var(--muted-foreground)">${icon.eye}</button>
              </div>
            </div>

            <p class="js-error text-sm text-red-600 hidden"></p>

            <button type="submit"
              class="w-full text-white py-3 rounded-xl text-sm font-semibold transition-colors mt-2"
              style="background: var(--primary)">Sign In</button>
          </form>

          <p class="text-center text-sm mt-6" style="color: var(--muted-foreground)">
            Don't have an account?
            <a href="/register" data-link class="font-semibold" style="color: var(--primary)">Create one free</a>
          </p>
        </div>
      </div>
    </div>
  `;
}

// ─── Logic / View Events ──────────────────────────────────────────────
export function initLogin() {
  const root = document.getElementById("app");

  // Sets the visual state of the tabs based on the active role
  const paintTabs = () => {
    root.querySelectorAll(".js-tab").forEach((btn) => {
      const active = btn.dataset.role === role;
      btn.textContent = btn.dataset.role === "tutor" ? "Tutor" : "Student";
      btn.style.background = active ? "#ffffff" : "transparent";
      btn.style.color = active ? "var(--primary)" : "var(--muted-foreground)";
      btn.style.boxShadow = active ? "0 1px 2px rgba(0,0,0,.05)" : "none";
    });
  };
  paintTabs();

  // Change rol
  root.querySelectorAll(".js-tab").forEach((btn) =>
    btn.addEventListener("click", () => {
      role = btn.dataset.role;
      paintTabs();
    })
  );

  // show / hide password
  const passInput = root.querySelector(".js-password");
  root.querySelector(".js-toggle-pass").addEventListener("click", (e) => {
    showPass = !showPass;
    passInput.type = showPass ? "text" : "password";
    e.currentTarget.innerHTML = showPass ? icon.eyeOff : icon.eye;
  });

  // form sent
  const form = root.querySelector(".js-login-form");
  const errorEl = root.querySelector(".js-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      // POST /api/auth/login (auth:false porque aún no hay token)
      const { token, user } = await api.post("/auth/login", { email, password }, { auth: false });
      saveSession({ token, user });

      // Redirect based on the role returned by the backend
      navigate(user.role === "tutor" ? "/tutor" : "/student");
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
    }
  });
}
