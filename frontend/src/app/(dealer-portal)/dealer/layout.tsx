"use client";

import Link from "next/link";
import { useAuth, useLogout } from "@/lib/hooks/use-auth";
import { AccessDenied, AuthChecking } from "@/components/ui/access-state";

const dealerNav = [
  { href: "/dealer", label: "Portal 首页" },
  { href: "/dealer/products", label: "商品目录" },
  { href: "/dealer/cart", label: "购物车" },
];

export default function DealerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = useAuth("DEALER");
  const logout = useLogout();

  if (!user) {
    return <AuthChecking />;
  }
  if (user.role !== "DEALER") {
    return <AccessDenied roleLabel="经销商（DEALER）" />;
  }

  return (
    <div className="dealer-shell">
      <aside className="dealer-sidebar">
        <Link className="dealer-brand" href="/dealer">
          WEMOVE Dealer
        </Link>
        <nav className="dealer-nav">
          {dealerNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="dealer-main">
        <header className="dealer-topbar">
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
