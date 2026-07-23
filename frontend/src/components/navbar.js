// ─── Navbar ───────────────────────────────────────────────────────────────────
// Top navigation bar, replica of the Figma design.
// Adapts to role: student sees "Home"; tutor sees "Home" + "Dashboard".
// Includes avatar dropdown with Profile and Sign Out.
// The microphone button opens/closes the voice assistant bar (LumiVoice).


import { getSession, logout } from "../helpers/auth.js";
import { navigate } from "../router/router.js";
import { openVoiceAssistant } from "./voiceAssistantBar.js";

// Íconos SVG inline (equivalentes a los de lucide del diseño)
const icon = {
  cap: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  home: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  dashboard: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  // AI Voice Assistant: micrófono con destellos (voz + IA)
  aiVoice: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><path d="m19.5 2.5.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4Z" fill="currentColor" stroke-width="1"/></svg>`,
  chevron: `<svg class="w-4 h-4 js-chevron transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  user: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  logout: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
};

// Devuelve las iniciales de un nombre ("Jordan Kim" -> "JK")
function initials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function navbar({ active = "home" } = {}) {
  const user = getSession() || { full_name: "Usuario", role: "student" };
  const isTutor = user.role === "tutor";

  // Estilo de un tab según si está activo (verde) o no.
  const tabStyle = (name) =>
    active === name
      ? `class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white" style="background: var(--primary)"`
      : `class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all" style="color: var(--muted-foreground)"`;

  // El student solo ve "Home"; el tutor ve "Home" + "Dashboard".
  const tabs = `
    <button data-nav="home" ${tabStyle("home")}>
      ${icon.home}<span class="hidden md:inline">Home</span>
    </button>
    ${isTutor ? `
    <button data-nav="dashboard" ${tabStyle("dashboard")}>
      ${icon.dashboard}<span class="hidden md:inline">Dashboard</span>
    </button>` : ""}
  `;

  return `
    <nav class="bg-white sticky top-0 z-40" style="border-bottom: 1px solid var(--border)">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        <!-- Logo -->
        <div class="flex items-center gap-2.5 shrink-0">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white" style="background: var(--primary)">${icon.cap}</div>
          <span class="text-lg font-bold" style="font-family: var(--font-family-display)">Lumora</span>
        </div>

        <!-- Tabs centrales -->
        <div class="flex items-center gap-1">
          ${tabs}
        </div>

        <!-- Zona derecha: asistente de voz + avatar -->
        <div class="flex items-center gap-2 shrink-0">
          <!-- Asistente de voz con IA -->
          <button class="js-ai-assistant relative p-2 rounded-lg transition-all cursor-pointer hover:bg-[var(--muted)]"
                  title="AI Voice Assistant"
                  style="color: var(--primary)">
            ${icon.aiVoice}
          </button>

          <div class="relative js-dropdown-wrap">
            <button class="js-avatar-btn flex items-center gap-2 pl-2 pr-2 sm:pr-3 py-2 rounded-lg transition-colors hover:bg-[var(--muted)]">
              <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                   style="background: var(--secondary); color: var(--primary); font-family: var(--font-family-display)">
                ${initials(user.full_name)}
              </div>
              <span class="hidden sm:inline text-sm font-medium">${user.full_name}</span>
              ${icon.chevron}
            </button>

            <!-- Dropdown -->
            <div class="js-dropdown hidden absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl py-1.5 z-50"
                 style="border: 1px solid var(--border)">
              <div class="px-4 py-2.5 mb-1" style="border-bottom: 1px solid var(--border)">
                <p class="text-xs font-semibold" style="font-family: var(--font-family-display)">${user.full_name}</p>
                <p class="text-xs capitalize" style="color: var(--muted-foreground)">${user.role}</p>
              </div>
              <button data-nav="profile" class="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-[var(--muted)] transition-colors" style="color: var(--muted-foreground)">
                ${icon.user}<span style="color: var(--foreground)">Profile</span>
              </button>
              <button class="js-signout w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                ${icon.logout}Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;
}

// Engancha los eventos del navbar (dropdown, navegación, logout).
// Se llama desde cada home después de inyectar el navbar.
export function initNavbar(root = document) {
  const wrap = root.querySelector(".js-dropdown-wrap");
  if (!wrap) return;

  const btn = wrap.querySelector(".js-avatar-btn");
  const menu = wrap.querySelector(".js-dropdown");
  const chevron = wrap.querySelector(".js-chevron");
  const aiButton = root.querySelector(".js-ai-assistant");

  // Abrir / cerrar dropdown
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
    chevron.style.transform = menu.classList.contains("hidden") ? "" : "rotate(180deg)";
  });

  // Cerrar al hacer click fuera
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      menu.classList.add("hidden");
      chevron.style.transform = "";
    }
  });

  // Navegación de los tabs y del dropdown
  root.querySelectorAll("[data-nav]").forEach((el) =>
    el.addEventListener("click", () => {
      const dest = el.dataset.nav;
      const user = getSession();
      if (dest === "home") navigate(user?.role === "tutor" ? "/tutor" : "/student");
      else if (dest === "dashboard") navigate("/tutor/dashboard");
      else if (dest === "profile") navigate("/profile");
    })
  );

  // Sign Out
  root.querySelector(".js-signout")?.addEventListener("click", () => {
    logout();
    navigate("/intro");
  });

  // AI Voice Assistant → abre / cierra la barra LumiVoice
  aiButton?.addEventListener("click", openVoiceAssistant);
}
