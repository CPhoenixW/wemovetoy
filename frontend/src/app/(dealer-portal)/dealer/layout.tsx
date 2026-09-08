"use client";

import Link from "next/link";
import { useAuth, useLogout } from "@/lib/hooks/use-auth";

const dealerNav = [
  { href: "/dealer", label: "Portal 首页" },
  { href: "/dealer/products", label: "商品目录" },
  { href: "/dealer/cart", label: "购物车" },
  { href: "/orders", label: "我的订单" },
  { href: "/dealer/company", label: "我的企业" },
  { href: "/dealer/apply", label: "经销商入驻" },
];

export default function DealerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = useAuth("DEALER");
  const logout = useLogout();

  if (!user || user.role !== "DEALER") {
    return null;
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
