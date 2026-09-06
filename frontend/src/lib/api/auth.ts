import { apiRequest } from "./client";
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

export function setCurrentUser(user: AuthenticatedUser): void {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** 服务端校验登录态并返回最新用户信息（含角色） */
export function getMe(): Promise<AuthenticatedUser> {
  return apiRequest("auth/me");
}
