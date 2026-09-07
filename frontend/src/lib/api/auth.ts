import { apiRequest } from "./client";
import type { AuthenticatedUser, LoginResult } from "./types";

export interface CredentialsInput {
  email: string;
  password: string;
}

export interface RegisterInput extends CredentialsInput {
  name?: string;
}

/** 登录：成功返回 accessToken + 用户信息（前端随后 storeAuth 落盘） */
export function login(input: CredentialsInput): Promise<LoginResult> {
  return apiRequest<LoginResult>("auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 注册普通用户：后端仅返回用户信息（不含 token），需要自动登录时再调 login */
export function register(input: RegisterInput): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

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
