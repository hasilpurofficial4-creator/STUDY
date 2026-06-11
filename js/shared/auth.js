import { verifyToken } from "./api.js";

const TOKEN_KEY = "shl_token";
const USER_KEY = "shl_user";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function isLoggedIn() {
  const t = getToken();
  if (!t) return false;
  try {
    const r = await verifyToken(t);
    return r.valid || false;
  } catch { return false; }
}

export function requireRole(role) {
  const user = getUser();
  if (!user || user.role !== role) {
    window.location.href = "/index.html";
    return false;
  }
  return true;
}

export function initAuthGuard(role) {
  isLoggedIn().then(ok => {
    if (!ok) { clearAuth(); window.location.href = "/index.html"; }
    else if (role && getUser().role !== role) { window.location.href = "/index.html"; }
  });
}