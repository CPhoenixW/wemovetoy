"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/api/auth";
import { getCart } from "@/lib/api/cart";
import { CART_UPDATED_EVENT } from "@/lib/cart-events";
import { clearAuth, getStoredToken } from "@/lib/auth-storage";
import type { AuthenticatedUser } from "@/lib/api/types";

export function SiteHeader() {
  // undefined = 尚未判断登录态；null = 未登录；对象 = 已登录
  const [user, setUser] = useState<AuthenticatedUser | null | undefined>(
    undefined,
  );
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }
    getMe()
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

  // 仅普通用户：拉取购物车件数，订阅变更事件保持徽标最新
  useEffect(() => {
    if (user?.role !== "USER") {
      setCartCount(0);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const cart = await getCart();
        if (!cancelled) setCartCount(cart.itemCount);
      } catch {
        if (!cancelled) setCartCount(0);
      }
    };
    refresh();
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, refresh);
    };
  }, [user]);

  function signOut() {
    clearAuth();
    window.location.assign("/products");
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/products">
        WEMOVE
      </Link>
      <nav aria-label="主导航">
        <Link href="/products">商品</Link>
        <Link href="/about">关于</Link>
        <Link href="/dealer/apply">经销商</Link>
        {user?.role === "USER" ? (
          <>
            <Link href="/orders">我的订单</Link>
            <Link
              href="/cart"
              className="cart-link"
              aria-label={`购物车，${cartCount} 件`}
            >
              购物车
              {cartCount > 0 ? (
                <span className="cart-count">{cartCount}</span>
              ) : null}
            </Link>
          </>
        ) : null}
        {user === undefined ? null : user ? (
          <>
            <span className="account-name">{user.name ?? user.email}</span>
            <button className="link-button" type="button" onClick={signOut}>
              退出登录
            </button>
          </>
        ) : (
          <Link href="/login">账户</Link>
        )}
      </nav>
    </header>
  );
}
