// Central communication layer with the backend.
// In development it stays as "/api" and Vite proxies it to the local backend.
// In production VITE_API_URL points to the deployed backend (for example on Render).
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

async function request(endpoint, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network-level failure (server down, CORS, Render cold start timeout...)
    throw new Error("Could not reach the server. Please try again in a moment.");
  }

  // Render / proxies can answer with non-JSON bodies (HTML error pages),
  // so we parse defensively instead of assuming valid JSON.
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // If the session expired, clean it up so the router sends the user to login.
    if (res.status === 401 || (res.status === 403 && data?.message?.includes("token"))) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    throw new Error(data?.message || `Request error (${res.status})`);
  }
  return data;
}

export const api = {
  get: (e) => request(e),
  post: (e, body, opts) => request(e, { method: "POST", body, ...opts }),
  put: (e, body) => request(e, { method: "PUT", body }),
  del: (e) => request(e, { method: "DELETE" }),
};
