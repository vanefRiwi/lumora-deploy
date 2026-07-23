// localStorage session managment.
export function saveSession({ token, user }) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getSession() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  // Close the LumiVoice bar if it is open, so it does not stay floating over
  // the intro/login screen after signing out (and any audio is stopped).
  // The bar exposes this global while mounted; see voiceAssistantBar.js.
  if (typeof window.__lumivoiceClose === "function") {
    window.__lumivoiceClose();
  }
}