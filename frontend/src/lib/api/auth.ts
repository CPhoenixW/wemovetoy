import { apiRequest } from "./client";
import type { AuthenticatedUser } from "./types";

export function getCurrentUser(accessToken: string): Promise<AuthenticatedUser> {
  return apiRequest<AuthenticatedUser>("auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
