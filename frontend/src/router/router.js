import { routes } from "./routes.js";
import { getSession } from "../helpers/auth.js";
import { notFoundView, initNotFound } from "../views/shared/notFoundView.js";
import { notAuthorizedView, initNotAuthorized } from "../views/shared/notAuthorizedView.js";

const app = () => document.getElementById("app");

// Browse without reloading (History API)
export function navigate(path) {
  history.pushState({}, "", path);
  renderRoute();
}

// Intercepts clicks on <a data-link> to navigate without reloading
function handleLinks() {
  document.body.addEventListener("click", (e) => {
    const link = e.target.closest("[data-link]");
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute("href"));
  });
}

// Displays an error message WITHOUT changing the URL.
// This way, the user sees the URL they tried to open (which is helpful and transparent),
// and can correct it or go back.
async function renderError(view, init) {
  app().innerHTML = view();
  if (init) await init();
}

// Renders the view for the current URL
export async function renderRoute() {
  const path = location.pathname;
  const session = getSession();

  // ── Root “/”: redirects to the appropriate home page (not a 404) ──
  // Logged-out visitors see the animated intro first, which then leads to /login.
  if (path === "/" || path === "") {
    return navigate(!session ? "/intro" : session.role === "tutor" ? "/tutor" : "/student");
  }

  const route = routes[path];

  // ── 404: The path does not exist ──
  if (!route) {
    return renderError(notFoundView, initNotFound);
  }

  // ── 403: The path exists, but the role does not have access ──
  // (or there is no session, and the path is protected)
  const isProtected = route.roles.length > 0;
  const hasRole = session && route.roles.includes(session.role);

  if (isProtected && !hasRole) {
    return renderError(notAuthorizedView, initNotAuthorized);
  }

  // ── Extra note: Some routes require more than just a role ──
  // Example: /student/course allows the TUTOR, but ONLY in preview mode
  // and ONLY for their own courses. `canAccess` returns true/false.
  if (route.canAccess) {
    const allowed = await route.canAccess(session);
    if (!allowed) {
      return renderError(notAuthorizedView, initNotAuthorized);
    }
  }

  // ── If the user is ALREADY logged in and goes to intro/login/register, we redirect them to their home page ──
  // (prevents a logged-in user from seeing the intro or login form)
  if (session && (path === "/intro" || path === "/login" || path === "/register")) {
    return navigate(session.role === "tutor" ? "/tutor" : "/student");
  }

  // ── Valid Route ──
  // Renders the initial view and then executes its init
  // (views that load data are re-rendered within their init)
  app().innerHTML = route.view();
  if (route.init) await route.init();
}

export function initRouter() {
  handleLinks();
  window.addEventListener("popstate", renderRoute);
  renderRoute();
}
