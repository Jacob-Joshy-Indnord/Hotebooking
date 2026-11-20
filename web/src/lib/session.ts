/**
 * File: web/src/lib/session.ts
 *
 * Browser-session storage for the signed-in user's credentials. Following
 * design.md, the per-user API key is entered once and kept in
 * sessionStorage. It lasts for the tab's lifetime and is never written to
 * localStorage or cookies. The user's role ("staff" or "admin") is cached
 * next to it. The role is worked out at sign-in by probing the admin-only
 * report endpoint, because the API has no identity endpoint, and it drives
 * the admin-only navigation and guard (task-xR5tK2uAzH2). The role only
 * decides what is shown; the API still enforces access.
 *
 * Functions: getApiKey(), getRole(), saveSession(key, role) and
 * clearSession(). All of them are safe during server rendering, where
 * window is undefined.
 */
export type Role = "staff" | "admin";

const API_KEY_STORAGE = "roombook.apiKey";
const ROLE_STORAGE = "roombook.role";

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function getApiKey(): string | null {
  return storage()?.getItem(API_KEY_STORAGE) ?? null;
}

export function getRole(): Role | null {
  const role = storage()?.getItem(ROLE_STORAGE);
  return role === "admin" || role === "staff" ? role : null;
}

export function saveSession(apiKey: string, role: Role): void {
  storage()?.setItem(API_KEY_STORAGE, apiKey);
  storage()?.setItem(ROLE_STORAGE, role);
}

export function clearSession(): void {
  storage()?.removeItem(API_KEY_STORAGE);
  storage()?.removeItem(ROLE_STORAGE);
}
