"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { listAdminProducts } from "@/lib/api/products";
import { listAdminOrders } from "@/lib/api/orders";
import { listAdminApplications } from "@/lib/api/dealers";

interface 仪表盘Stats {
  productTotal: number;
  draftTotal: number;
  pendingOrders: number;
  pendingApplications: number;
}

const quickLinks = [
  {
    href: "/admin/products",
    title: "商品管理",
    desc: "新建/编辑商品、维护 SKU、发布与下架",
  },
  {
    href: "/admin/orders",
    title: "订单管理",
    desc: "查看订单详情，处理收款、发货与完成",
  },
  {
    href: "/admin/dealers",
    title: "经销商审核",
    desc: "审批经销商入驻申请",
  },
];

export default function Admin仪表盘Page() {
  const router = useRouter();
  const [stats, setStats] = useState<仪表盘Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [products, drafts, orders, applications] = await Promise.all([
        listAdminProducts({ page: 1, limit: 1 }),
        listAdminProducts({ page: 1, limit: 1, status: "DRAFT" }),
        listAdminOrders({ page: 1, pageSize: 1, status: "PENDING" }),
        listAdminApplications("PENDING"),
      ]);
      setStats({
        productTotal: products.total,
        draftTotal: drafts.total,
        pendingOrders: orders.total,
        pendingApplications: applications.length,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?next=%2Fadmin");
        return;
      }
      setError(err instanceof Error ? err.message : "加载统计数据失败");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = stats
    ? [
        {
          label: "商品总数",
          value: stats.productTotal,
          hint: `草稿 ${stats.draftTotal} 个`,
          href: "/admin/products",
        },
        {
          label: "待处理订单",
          value: stats.pendingOrders,
          hint: "PENDING 待收款",
          href: "/admin/orders",
        },
        {
          label: "待审核经销商申请",
          value: stats.pendingApplications,
          hint: "PENDING 待审批",
          href: "/admin/dealers",
        },
      ]
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">管理后台</p>
          <h1>仪表盘</h1>
        </div>
      </div>

      {loading ? (
        <p className="page-loading">加载中...</p>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>统计数据加载失败</h3>
          <p>{error}</p>
          <div className="empty-action">
            <button type="button" className="btn-secondary" onClick={load}>
              重试
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            {cards.map((card) => (
              <Link key={card.label} href={card.href} className="stat-card">
                <span className="stat-card__value">{card.value}</span>
                <span className="stat-card__label">{card.label}</span>
                <span className="stat-card__hint">{card.hint}</span>
              </Link>
            ))}
          </div>

          <h2 className="section-title">快捷入口</h2>
          <div className="quick-link-grid">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className="quick-link-card">
                <strong>{item.title}</strong>
                <span className="muted-text">{item.desc}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
