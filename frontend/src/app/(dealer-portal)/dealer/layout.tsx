"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth, useLogout } from "@/lib/hooks/use-auth";
import { AccessDenied, AuthChecking } from "@/components/ui/access-state";

const dealerNav = [
  { href: "/dealer", label: "Portal 首页" },
  { href: "/dealer/products", label: "商品目录" },
  { href: "/dealer/cart", label: "购物车" },
  { href: "/dealer/company", label: "我的企业" },
];

export default function DealerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = useAuth("DEALER");
  const logout = useLogout();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) {
    return <AuthChecking />;
  }
  if (user.role !== "DEALER") {
    return <AccessDenied roleLabel="经销商（DEALER）" />;
  }

  function isActive(href: string) {
    if (href === "/dealer") return pathname === "/dealer" || pathname === "/dealer/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="dealer-shell">
      <aside className={`dealer-sidebar${menuOpen ? " open" : ""}`}>
        <button
          type="button"
          className="drawer-close"
          onClick={() => setMenuOpen(false)}
          aria-label="关闭导航"
        >
          ×
        </button>
        <Link className="dealer-brand" href="/dealer">
          WEMOVE Dealer
        </Link>
        <nav className="dealer-nav">
          {dealerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      {menuOpen ? (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />
      ) : null}

      <div className="dealer-main">
        <header className="dealer-topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="打开导航"
          >
            ☰
          </button>
          <span className="dealer-user">
            {user.name ?? user.email} · {user.role}
          </span>
          <button type="button" onClick={logout} className="logout-btn">
            退出
          </button>
        </header>
        <main className="dealer-content">{children}</main>
      </div>
    </div>
  );
}
