import type { AuthenticatedUser } from "./types";

const TOKEN_KEY = "wemove.accessToken";
const USER_KEY = "wemove.user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getCurrentUser(): AuthenticatedUser | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthenticatedUser): void {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}
