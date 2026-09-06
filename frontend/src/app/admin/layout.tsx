"use client";

import Link from "next/link";
import { useAuth, useLogout } from "@/lib/hooks/use-auth";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "商品管理" },
  { href: "/admin/dealers", label: "Dealer 审核" },
  { href: "/admin/orders", label: "订单管理" },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = useAuth("ADMIN");
  const logout = useLogout();

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">WEMOVE Admin</Link>
        <nav className="admin-nav">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-user">
            {user.name ?? user.email} · {user.role}
          </span>
          <button type="button" onClick={logout} className="logout-btn">
            退出
          </button>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
