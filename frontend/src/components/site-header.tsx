"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/auth";
import { clearAuth, getStoredToken } from "@/lib/auth-storage";
import type { AuthenticatedUser } from "@/lib/api/types";

export function SiteHeader() {
  // undefined = 尚未判断登录态；null = 未登录；对象 = 已登录
  const [user, setUser] = useState<AuthenticatedUser | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }
    getCurrentUser(token)
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        clearAuth();
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function signOut() {
    clearAuth();
    window.location.assign("/products");
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/products">
        WEMOVE SPORTS
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/products">Products</Link>
        <Link href="/dealer/apply">Dealer</Link>
        {user === undefined ? null : user ? (
          <>
            <span className="account-name">{user.name ?? user.email}</span>
            <button className="link-button" type="button" onClick={signOut}>
              Sign out
            </button>
          </>
        ) : (
          <Link href="/login">Account</Link>
        )}
      </nav>
    </header>
  );
}
