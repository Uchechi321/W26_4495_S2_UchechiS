/**
 * API helper: sends X-User-Email from login (localStorage "auth") so the backend
 * scopes wells, reports, and uploads per user.
 */
export function getAuthEmail() {
  return localStorage.getItem("auth") || "";
}

export async function apiFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  const email = getAuthEmail();
  if (email) headers.set("X-User-Email", email);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && !init.skipAuthRedirect) {
    localStorage.removeItem("auth");
    localStorage.removeItem("recentWells");
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    if (!path.startsWith("/login") && !path.startsWith("/signup") && path !== "/") {
      window.location.assign("/login");
    }
  }
  return res;
}
