"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useLogout } from "@/lib/hooks/use-auth";
import { AccessDenied, AuthChecking } from "@/components/ui/access-state";

const adminNav = [
  { href: "/admin", label: "仪表盘" },
  { href: "/admin/products", label: "商品管理" },
  { href: "/admin/dealers", label: "经销商审核" },
  { href: "/admin/orders", label: "订单管理" },
];

const roleLabels: Record<string, string> = {
  ADMIN: "管理员",
  DEALER: "经销商",
  USER: "普通用户",
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = useAuth("ADMIN");
  const logout = useLogout();
  const pathname = usePathname();

  if (!user) {
    return <AuthChecking />;
  }
  if (user.role !== "ADMIN") {
    return <AccessDenied roleLabel="管理员" />;
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin" || pathname === "/admin/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">WEMOVE 管理后台</Link>
        <nav className="admin-nav">
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span className="admin-user">
            {user.name ?? user.email}
            <span className="role-badge">{roleLabels[user.role] ?? user.role}</span>
          </span>
          <button type="button" onClick={logout} className="logout-btn">
            退出登录
          </button>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
