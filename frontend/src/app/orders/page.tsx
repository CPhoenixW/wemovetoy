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
        setError(err instanceof Error ? err.message : "Failed to load orders");
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
          <p className="eyebrow">Account</p>
          <h1>My Orders</h1>
          <p className="page-subtitle">
            Order history and status — prices as finalized at checkout.
          </p>
        </div>
        <Link href="/products" className="link-secondary">
          ← Continue shopping
        </Link>
      </div>

      {loading ? (
        <p className="page-loading">Loading…</p>
      ) : error && !orders ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Couldn’t load your orders</h3>
          <p>{error}</p>
          <div className="empty-action">
            <button type="button" className="btn-secondary" onClick={() => load(page)}>
              Retry
            </button>
            <Link href="/products" className="btn-primary">
              Browse products
            </Link>
          </div>
        </div>
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Orders you place will show up here with their current status."
          action={
            <Link href="/products" className="btn-primary">
              Browse products
            </Link>
          }
        />
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: "orderNumber",
                header: "Order",
                render: (o) => <span className="mono">{o.orderNumber}</span>,
              },
              {
                key: "createdAt",
                header: "Date",
                render: (o) => <span className="muted-text">{formatDate(o.createdAt)}</span>,
              },
              {
                key: "status",
                header: "Status",
                render: (o) => (
                  <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
                ),
              },
              {
                key: "totalAmount",
                header: "Total",
                render: (o) => formatPrice(o.totalAmount),
              },
              {
                key: "view",
                header: "",
                render: (o) => (
                  <Link href={`/orders/${o.id}`} className="link-primary">
                    View
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
                Previous
              </button>
              <span className="page-info">
                Page {page} of {totalPages} · {total} order{total === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                className="btn-secondary page-btn"
                disabled={page >= totalPages}
                onClick={() => goTo(page + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
