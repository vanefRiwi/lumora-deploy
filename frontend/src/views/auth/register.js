// ─── Register View ────────────────────────────────────────────────────────────
// 2-step wizard (Account -> Profile), replicating the Figma design.
// Upon completion: log in with the selected role and redirect to the user's home page.

import { navigate } from "../../router/router.js";
import { saveSession } from "../../helpers/auth.js";
import { api } from "../../helpers/api.js";

// Local view state
let step = 1;                // 1 = Account, 2 = Profile
let showPass = false;
let role = "student";        // "student" | "tutor"
const form = { name: "", email: "", password: "", role: "student", goal: "" };

const icon = {
  cap: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  eye: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
  arrow: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  check: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
};

const GOAL_OPTIONS = ["Career change", "Skill upgrade", "Academic study", "Personal interest", "Teaching"];

// Step indicator (1 Account —— 2 Profile)
function stepsIndicator() {
  const dot = (s, label) => {
    const done = step > s;
    const active = step >= s;
    return `
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
             style="background: ${active ? "var(--primary)" : "var(--muted)"}; color: ${active ? "#fff" : "var(--muted-foreground)"}">
          ${done ? icon.check : s}
        </div>
        <span class="text-xs font-medium" style="color: ${active ? "var(--primary)" : "var(--muted-foreground)"}">${label}</span>
        ${s === 1 ? `<div class="w-12 h-0.5 rounded-full" style="background: ${step > 1 ? "var(--primary)" : "var(--border)"}"></div>` : ""}
      </div>`;
  };
  return `<div class="flex items-center gap-3 mb-8">${dot(1, "Account")}${dot(2, "Profile")}</div>`;
}

// Fields from Step 1 (Account)
function stepOneFields() {
  return `
    <div>
      <label class="block text-sm font-medium mb-1.5">Full Name</label>
      <input name="name" type="text" value="${form.name}" required placeholder="Your full name"
        class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
        style="background: var(--muted); border: 1px solid var(--border)" />
    </div>
    <div>
      <label class="block text-sm font-medium mb-1.5">Email address</label>
      <input name="email" type="email" value="${form.email}" required placeholder="you@example.com"
        class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
        style="background: var(--muted); border: 1px solid var(--border)" />
    </div>
    <div>
      <label class="block text-sm font-medium mb-1.5">Password</label>
      <div class="relative">
        <input name="password" type="${showPass ? "text" : "password"}" value="${form.password}" required placeholder="At least 8 characters"
          class="js-password w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
          style="background: var(--muted); border: 1px solid var(--border)" />
        <button type="button" class="js-toggle-pass absolute right-3.5 top-1/2 -translate-y-1/2" style="color: var(--muted-foreground)">
          ${showPass ? icon.eyeOff : icon.eye}
        </button>
      </div>
    </div>`;
}

// Fields from Step 2 (Profile)
function stepTwoFields() {
  const roleBtn = (r, label) => {
    const active = role === r;
    return `<button type="button" data-role="${r}"
      class="js-role py-3.5 rounded-xl text-sm font-semibold transition-all"
      style="border: 2px solid ${active ? "var(--primary)" : "var(--border)"};
             background: ${active ? "var(--secondary)" : "var(--muted)"};
             color: ${active ? "var(--primary)" : "var(--muted-foreground)"}">${label}</button>`;
  };
  return `
    <div>
      <label class="block text-sm font-medium mb-2">I am joining as...</label>
      <div class="grid grid-cols-2 gap-3">
        ${roleBtn("student", "Student")}
        ${roleBtn("tutor", "Tutor")}
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium mb-1.5">Learning Goal</label>
      <select name="goal" class="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
        style="background: var(--muted); border: 1px solid var(--border)">
        <option value="">Select your primary goal...</option>
        ${GOAL_OPTIONS.map((o) => `<option ${form.goal === o ? "selected" : ""}>${o}</option>`).join("")}
      </select>
    </div>`;
}

export function registerView() {
  return `
    <div class="min-h-screen flex" style="font-family: var(--font-family-body)">

      <!-- Panel izquierdo (verde con degradado) -->
      <div class="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
           style="background: linear-gradient(to bottom right, #166534, var(--primary))">
        <div class="relative z-10">
          <div class="flex items-center gap-2.5 mb-12">
            <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">${icon.cap}</div>
            <span class="text-xl font-bold text-white" style="font-family: var(--font-family-display)">Lumora</span>
          </div>
          <h2 class="text-4xl font-bold text-white leading-tight mb-4" style="font-family: var(--font-family-display)">Start your<br/>journey today.</h2>
          <p class="text-green-100 text-lg leading-relaxed max-w-sm">Join thousands of learners and Tutors building real skills for a better career.</p>
        </div>
        <div class="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/5"></div>
        <div class="absolute -left-10 -bottom-16 w-60 h-60 rounded-full bg-white/5"></div>
      </div>

      <!-- Panel derecho (formulario) -->
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="w-full max-w-md">
          <div class="lg:hidden flex items-center gap-2.5 mb-8">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white" style="background: var(--primary)">${icon.cap}</div>
            <span class="text-xl font-bold" style="font-family: var(--font-family-display)">Lumora</span>
          </div>

          ${stepsIndicator()}

          <h1 class="text-2xl font-bold mb-1" style="font-family: var(--font-family-display)">
            ${step === 1 ? "Create your account" : "Complete your profile"}
          </h1>
          <p class="mb-8 text-sm" style="color: var(--muted-foreground)">
            ${step === 1 ? "Free forever. No credit card required." : "Help us personalize your experience."}
          </p>

          <form class="js-register-form space-y-4">
            ${step === 1 ? stepOneFields() : stepTwoFields()}

            <p class="js-error text-sm text-red-600 hidden"></p>

            <button type="submit"
              class="w-full text-white py-3 rounded-xl text-sm font-semibold transition-colors mt-2 flex items-center justify-center gap-2"
              style="background: var(--primary)">
              ${step === 1 ? "Continue" : "Create Account"} ${icon.arrow}
            </button>
          </form>

          ${step === 1 ? `
            <p class="text-center text-sm mt-6" style="color: var(--muted-foreground)">
              Already have an account?
              <a href="/login" data-link class="font-semibold" style="color: var(--primary)">Sign in</a>
            </p>` : `
            <button class="js-back mt-4 text-sm w-full text-center transition-colors" style="color: var(--muted-foreground)">&larr; Back</button>`}
        </div>
      </div>
    </div>
  `;
}

// Save what was written in the current step before re-rendering
function captureStepData(root) {
  const f = root.querySelector(".js-register-form");
  if (step === 1) {
    form.name = f.name.value;
    form.email = f.email.value;
    form.password = f.password.value;
  } else {
    form.goal = f.goal.value;
    form.role = role;
  }
}

// Re-render the view (to switch steps) and re-attach events
function rerender() {
  const app = document.getElementById("app");
  app.innerHTML = registerView();
  initRegister();
}

export function initRegister() {
  const root = document.getElementById("app");

  // Show / hide password (step 1)
  const toggle = root.querySelector(".js-toggle-pass");
  if (toggle) {
    toggle.addEventListener("click", () => {
      captureStepData(root);
      showPass = !showPass;
      rerender();
    });
  }

  // Role selection (step 2)
  root.querySelectorAll(".js-role").forEach((btn) =>
    btn.addEventListener("click", () => {
      role = btn.dataset.role;
      captureStepData(root);
      rerender();
    })
  );

  // Role selection (step 2)
  root.querySelector(".js-back")?.addEventListener("click", () => {
    captureStepData(root);
    step = 1;
    rerender();
  });

  // Submit the form
  root.querySelector(".js-register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    captureStepData(root);

    if (step === 1) {
      step = 2;
      rerender();
      return;
    }

    // ── Step 2 complete: create the account against the REAL backend ──
    // POST /api/auth/register persists the user in PostgreSQL and returns
    // { token, user } with the same shape as login, so the session survives
    // reloads and future logins.
    const errorEl = root.querySelector(".js-error");
    const submitBtn = root.querySelector('button[type="submit"]');
    errorEl.classList.add("hidden");
    submitBtn.disabled = true;

    try {
      const { token, user } = await api.post(
        "/auth/register",
        {
          full_name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,                  // "student" | "tutor"
          learning_goal: form.goal || null,
        },
        { auth: false }
      );

      saveSession({ token, user });

      const destination = user.role === "tutor" ? "/tutor" : "/student";

      // Reset the wizard state so that if the user logs out and returns to
      // /register, they start fresh.
      step = 1;
      showPass = false;
      role = "student";
      form.name = form.email = form.password = form.goal = "";
      form.role = "student";

      navigate(destination);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove("hidden");
      submitBtn.disabled = false;
    }
  });
}
