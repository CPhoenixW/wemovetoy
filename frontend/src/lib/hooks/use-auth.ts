"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, clearToken } from "@/lib/api/auth";
import type { AuthenticatedUser } from "@/lib/api/types";

type Role = "USER" | "DEALER" | "ADMIN";

export function useAuth(requiredRole?: Role): AuthenticatedUser | null {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    // 未登录 → 去登录页
    if (!user) {
      router.replace("/login");
      return;
    }

    // 角色不匹配 → 去对应角色的页面
    if (requiredRole && user.role !== requiredRole) {
      clearToken();
      router.replace("/login");
    }
  }, [user, requiredRole, router]);

  return user;
}

export function useLogout() {
  const router = useRouter();
  return () => {
    clearToken();
    router.replace("/login");
  };
}
