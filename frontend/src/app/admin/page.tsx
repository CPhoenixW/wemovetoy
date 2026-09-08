"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { listAdminProducts } from "@/lib/api/products";
import { listAdminOrders } from "@/lib/api/orders";
import { listAdminApplications } from "@/lib/api/dealers";
import type {
  AdminOrderListItem,
  AdminProduct,
  DealerApplication,
} from "@/lib/api/types";
import { formatDate, formatPrice } from "@/lib/format";

interface DashboardStats {
  productTotal: number;
  draftTotal: number;
  pendingOrders: number;
  pendingApplications: number;
}

// 待处理区块每类最多展示条数
const TODO_LIMIT = 5;

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
    title: "Dealer 审核",
    desc: "审批经销商入驻申请",
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingOrderItems, setPendingOrderItems] = useState<
    AdminOrderListItem[]
  >([]);
  const [pendingApps, setPendingApps] = useState<DealerApplication[]>([]);
  const [draftProducts, setDraftProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 并行拉取统计 + 待处理列表
      const [products, drafts, orders, applications] = await Promise.all([
        listAdminProducts({ page: 1, limit: 1 }),
        listAdminProducts({ page: 1, limit: TODO_LIMIT, status: "DRAFT" }),
        listAdminOrders({
          page: 1,
          pageSize: TODO_LIMIT,
          status: "PENDING",
        }),
        listAdminApplications("PENDING"),
      ]);
      setStats({
        productTotal: products.total,
        draftTotal: drafts.total,
        pendingOrders: orders.total,
        pendingApplications: applications.length,
      });
      setPendingOrderItems(orders.items);
      setDraftProducts(drafts.items);
      setPendingApps(applications.slice(0, TODO_LIMIT));
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
          <p className="eyebrow">Admin Console</p>
          <h1>Dashboard</h1>
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

          {/* 待处理事项区块：让管理员 10 秒内知道要处理什么 */}
          <h2 className="section-title">待处理事项</h2>
          <div className="todo-grid">
            {/* 待确认收款订单 */}
            <section className="todo-section">
              <div className="todo-head">
                <h3 className="todo-title">待确认收款订单</h3>
                {stats ? (
                  <span className="todo-count">{stats.pendingOrders}</span>
                ) : null}
              </div>
              {pendingOrderItems.length === 0 ? (
                <p className="todo-empty">暂无待收款订单</p>
              ) : (
                <ul className="todo-list">
                  {pendingOrderItems.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="todo-item"
                      >
                        <span className="todo-item__no">{o.orderNumber}</span>
                        <span className="todo-item__meta">
                          {o.customer.name ?? o.customer.email}
                        </span>
                        <span className="todo-item__amount">
                          {formatPrice(o.totalAmount)}
                        </span>
                        <span className="todo-item__date">
                          {formatDate(o.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/admin/orders"
                className="todo-more"
              >
                查看全部订单 →
              </Link>
            </section>

            {/* 待审核 Dealer 申请 */}
            <section className="todo-section">
              <div className="todo-head">
                <h3 className="todo-title">待审核经销商申请</h3>
                {stats ? (
                  <span className="todo-count">
                    {stats.pendingApplications}
                  </span>
                ) : null}
              </div>
              {pendingApps.length === 0 ? (
                <p className="todo-empty">暂无待审核申请</p>
              ) : (
                <ul className="todo-list">
                  {pendingApps.map((a) => (
                    <li key={a.id}>
                      <Link href="/admin/dealers" className="todo-item">
                        <span className="todo-item__no">{a.companyName}</span>
                        <span className="todo-item__meta">
                          {a.contactName ?? "—"}
                        </span>
                        <span className="todo-item__date">
                          {formatDate(a.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/admin/dealers"
                className="todo-more"
              >
                查看全部申请 →
              </Link>
            </section>

            {/* 草稿商品 */}
            <section className="todo-section">
              <div className="todo-head">
                <h3 className="todo-title">草稿商品</h3>
                {stats ? (
                  <span className="todo-count">{stats.draftTotal}</span>
                ) : null}
              </div>
              {draftProducts.length === 0 ? (
                <p className="todo-empty">暂无草稿商品</p>
              ) : (
                <ul className="todo-list">
                  {draftProducts.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="todo-item"
                      >
                        <span className="todo-item__no">{p.name}</span>
                        <span className="todo-item__meta">
                          {p.category?.name ?? "未分类"}
                        </span>
                        <span className="todo-item__amount">
                          {formatPrice(p.price)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/admin/products"
                className="todo-more"
              >
                查看全部商品 →
              </Link>
            </section>
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
