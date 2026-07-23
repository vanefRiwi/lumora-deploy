// ─── Profile View ─────────────────────────────────────────────────────────────
// User profile (student or tutor), replica of Figma design.
// Has navbar at top. Includes "Save changes" and "Log out".

import { navbar, initNavbar } from "../../components/navbar.js";
import { getSession, logout } from "../../helpers/auth.js";
import { getProfile, updateProfile, LEARNING_GOALS } from "../../services/userService.js";
import { showToast } from "../../helpers/toast.js";
import { navigate } from "../../router/router.js";

// Goals come from the service (single source of truth)
const GOAL_OPTIONS = LEARNING_GOALS;

const logoutIcon = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`;

function initials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function profileView() {
  const user = getSession() || { full_name: "Usuario", email: "", role: "student", learning_goal: "" };
  const roleLabel = user.role === "tutor" ? "Tutor" : "Student";
  const goal = user.learning_goal || (user.role === "tutor" ? "Teaching" : "Career change");

  return `
    <div class="min-h-screen" style="background: var(--background)">
      ${navbar()}

      <div class="w-full max-w-[500px] mx-auto px-4 py-12" style="font-family: var(--font-family-body)">

        <!-- Avatar + name + role -->
        <div class="flex flex-col items-center mb-8">
          <div class="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg"
               style="background: var(--primary); font-family: var(--font-family-display)">
            ${initials(user.full_name)}
          </div>
          <h1 class="text-xl font-bold mb-1" style="font-family: var(--font-family-display)">${user.full_name}</h1>
          <span class="text-xs font-semibold px-3 py-1 rounded-full" style="background: var(--secondary); color: var(--primary)">${roleLabel}</span>
        </div>

        <!-- Fields card -->
        <div class="rounded-2xl p-6 space-y-5" style="background: var(--card); border: 1px solid var(--border)">
          <div>
            <label class="block text-sm font-medium mb-1.5">Full name</label>
            <input name="fullName" type="text" value="${user.full_name}"
              class="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style="background: var(--muted); border: 1px solid var(--border)" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Email address</label>
            <input name="email" type="email" value="${user.email || ""}"
              class="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style="background: var(--muted); border: 1px solid var(--border)" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Learning goal</label>
            <select name="goal" class="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style="background: var(--muted); border: 1px solid var(--border)">
              ${GOAL_OPTIONS.map((o) => `<option ${goal === o ? "selected" : ""}>${o}</option>`).join("")}
            </select>
          </div>

          <button class="js-save w-full py-3 rounded-xl text-sm font-semibold transition-all mt-1 text-white"
                  style="background: var(--primary)">Save changes</button>
        </div>

        <!-- Log out (separate, below the card) -->
        <button class="js-logout mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-red-600 transition-all"
                style="border: 1px solid var(--border)">
          ${logoutIcon} Log out
        </button>
      </div>
    </div>
  `;
}

export function initProfile() {
  const root = document.getElementById("app");
  initNavbar(root);

  // Save changes -> ALWAYS through the service.
  // ⚠️ The view does NOT touch localStorage: that lives in services/userService.js.
  //    When PUT /api/users/me exists, only the service changes.
  const saveBtn = root.querySelector(".js-save");
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
      await updateProfile({
        full_name: root.querySelector('[name="fullName"]').value,
        email: root.querySelector('[name="email"]').value,
        learning_goal: root.querySelector('[name="goal"]').value,
      });

      saveBtn.textContent = "\u2713 Changes saved";
      saveBtn.style.background = "var(--secondary)";
      saveBtn.style.color = "var(--primary)";

      setTimeout(() => {
        saveBtn.textContent = "Save changes";
        saveBtn.style.background = "var(--primary)";
        saveBtn.style.color = "#fff";
        saveBtn.disabled = false;
        // Re-renders the view to reflect the new name (avatar + navbar)
        const app = document.getElementById("app");
        app.innerHTML = profileView();
        initProfile();
      }, 1500);
    } catch (err) {
      showToast(err.message, "error");
      saveBtn.textContent = "Save changes";
      saveBtn.disabled = false;
    }
  });

  // Log out: clears session and returns to login
  root.querySelector(".js-logout").addEventListener("click", () => {
    logout();
    navigate("/intro");
  });
}
