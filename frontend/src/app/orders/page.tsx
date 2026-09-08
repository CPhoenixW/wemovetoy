"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { listMyOrders } from "@/lib/api/orders";
import type { Order } from "@/lib/api/types";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status-label";

const PAGE_SIZE = 20;

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(
    async (target: number) => {
      setLoading(true);
      setError("");
      try {
        const result = await listMyOrders({ page: target, pageSize: PAGE_SIZE });
        setOrders(result.items);
        setTotal(result.total);
        setTotalPages(Math.max(1, result.totalPages));
        setPage(result.page);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?next=${encodeURIComponent("/orders")}`);
          return;
        }
        setError(err instanceof Error ? err.message : "订单加载失败");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  function goTo(target: number) {
    if (target < 1 || target > totalPages) return;
    load(target);
  }

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">我的账户</p>
          <h1>我的订单</h1>
          <p className="page-subtitle">
            订单历史与状态——价格为下单时最终确认价。
          </p>
        </div>
        <Link href="/products" className="link-secondary">
          ← 继续购物
        </Link>
      </div>

      {loading ? (
        <p className="page-loading">加载中…</p>
      ) : error && !orders ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>无法加载你的订单</h3>
          <p>{error}</p>
          <div className="empty-action">
            <button type="button" className="btn-secondary" onClick={() => load(page)}>
              重试
            </button>
            <Link href="/products" className="btn-primary">
              去逛逛
            </Link>
          </div>
        </div>
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title="暂无订单"
          description="你下的订单会显示在这里，并带有当前状态。"
          action={
            <Link href="/products" className="btn-primary">
              去逛逛
            </Link>
          }
        />
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: "orderNumber",
                header: "订单号",
                render: (o) => <span className="mono">{o.orderNumber}</span>,
              },
              {
                key: "createdAt",
                header: "下单时间",
                render: (o) => <span className="muted-text">{formatDate(o.createdAt)}</span>,
              },
              {
                key: "status",
                header: "状态",
                render: (o) => (
                  <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
                ),
              },
              {
                key: "totalAmount",
                header: "金额",
                render: (o) => (
                  <span className="tnum">{formatPrice(o.totalAmount)}</span>
                ),
              },
              {
                key: "view",
                header: "",
                render: (o) => (
                  <Link href={`/orders/${o.id}`} className="link-primary">
                    查看
                  </Link>
                ),
              },
            ]}
            data={orders}
            rowKey={(o) => o.id}
          />
          {totalPages > 1 ? (
            <div className="pagination">
              <button
                type="button"
                className="btn-secondary page-btn"
                disabled={page <= 1}
                onClick={() => goTo(page - 1)}
              >
                上一页
              </button>
              <span className="page-info tnum">
                第 {page} / {totalPages} 页 · 共 {total} 笔订单
              </span>
              <button
                type="button"
                className="btn-secondary page-btn"
                disabled={page >= totalPages}
                onClick={() => goTo(page + 1)}
              >
                下一页
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
