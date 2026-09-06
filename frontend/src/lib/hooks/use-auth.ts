"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, setCurrentUser, clearToken, getMe } from "@/lib/api/auth";
import type { AuthenticatedUser } from "@/lib/api/types";

type Role = "USER" | "DEALER" | "ADMIN";

export function roleHome(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "DEALER") return "/dealer";
  return "/";
}

/**
 * 登录态守卫：登录态必须经 GET /auth/me 服务端校验，不信任浏览器存储中的
 * 缓存用户。校验完成前返回 null（页面渲染空），防止伪造本地角色进入页面。
 * - 无 token / 校验失败（401 等）→ 清理并跳转登录页
 * - 服务端角色与所需角色不符 → 跳转到该用户自己的角色首页（保留会话）
 */
export function useAuth(requiredRole?: Role): AuthenticatedUser | null {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!getToken()) {
      setChecked(true);
      router.replace("/login");
      return;
    }

    getMe()
      .then((me) => {
        if (cancelled) return;
        setCurrentUser(me);
        setUser(me);
        if (requiredRole && me.role !== requiredRole) {
          router.replace(roleHome(me.role));
        }
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [requiredRole, router]);

  return checked ? user : null;
}

export function useLogout() {
  const router = useRouter();
  return () => {
    clearToken();
    router.replace("/login");
  };
}
