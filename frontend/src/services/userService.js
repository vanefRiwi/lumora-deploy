// ─── User Service ─────────────────────────────────────────────────────────────
// Only gateway to user data. Fully wired to the backend: the profile lives in
// the `users` table and every update goes through PUT /api/users/me.
// The localStorage session is only a CACHE of the authenticated user.

import { api } from "../helpers/api.js";
import { getSession, saveSession } from "../helpers/auth.js";

// Available learning goals
export const LEARNING_GOALS = [
  "Career change",
  "Skill upgrade",
  "Academic study",
  "Personal interest",
  "Teaching",
];

// GET /api/users/me -> authenticated user data (refreshes the local cache)
export async function getProfile() {
  try {
    const { user } = await api.get("/users/me");
    saveSession({ token: localStorage.getItem("token"), user });
    return user;
  } catch {
    // Offline fallback: last cached session
    return getSession();
  }
}

// PUT /api/users/me -> updates the profile in PostgreSQL.
// Returns the updated user and refreshes the cached session.
export async function updateProfile({ full_name, email, learning_goal }) {
  if (!full_name?.trim()) throw new Error("Name cannot be empty.");
  if (!email?.trim()) throw new Error("Email cannot be empty.");

  const { user } = await api.put("/users/me", {
    full_name: full_name.trim(),
    email: email.trim(),
    learning_goal,
  });

  saveSession({ token: localStorage.getItem("token"), user });
  return user;
}
