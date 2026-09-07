"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { cancelMyOrder, getMyOrder } from "@/lib/api/orders";
import type { Order } from "@/lib/api/types";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status-label";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [note, setNote] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrder(await getMyOrder(orderId));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace(
            `/login?next=${encodeURIComponent(`/orders/${orderId}`)}`,
          );
          return;
        }
        if (err.status === 403 || err.status === 404) {
          setNotFound(true);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (!Number.isFinite(orderId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    load();
  }, [orderId, load]);

  async function confirmCancel() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await cancelMyOrder(orderId);
      setCancelOpen(false);
      await load();
      setNote("Order cancelled.");
    } catch (err) {
      setCancelOpen(false);
      if (err instanceof ApiError && err.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/orders/${orderId}`)}`);
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to cancel order";
      // 订单可能已被后台流转/抢先取消：重载以显示最新状态并给出原因
      await load();
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const canCancel = order?.status === "PENDING";

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Order details</h1>
        </div>
        <Link href="/orders" className="link-secondary">
          ← My orders
        </Link>
      </div>

      {loading ? (
        <p className="page-loading">Loading…</p>
      ) : notFound ? (
        <EmptyState
          title="Order not found"
          description="This order doesn’t exist or isn’t visible to your account."
          action={
            <Link href="/orders" className="btn-primary">
              Back to my orders
            </Link>
          }
        />
      ) : error && !order ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>Couldn’t load this order</h3>
          <p>{error}</p>
          <div className="empty-action">
            <button type="button" className="btn-secondary" onClick={load}>
              Retry
            </button>
            <Link href="/orders" className="btn-primary">
              Back to my orders
            </Link>
          </div>
        </div>
      ) : order ? (
        <div className="order-detail">
          {note ? <p className="form-success">{note}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <div className="order-detail__head">
            <span className="mono">{order.orderNumber}</span>
            <StatusBadge status={order.status} label={ORDER_STATUS_LABEL[order.status]} />
            <span className="muted-text">Placed {formatDate(order.createdAt)}</span>
          </div>

          {order.shippingName ||
          order.shippingPhone ||
          order.shippingAddress ||
          order.remark ? (
            <dl className="order-meta">
              {order.shippingName ? (
                <div>
                  <dt>Recipient</dt>
                  <dd>{order.shippingName}</dd>
                </div>
              ) : null}
              {order.shippingPhone ? (
                <div>
                  <dt>Phone</dt>
                  <dd>{order.shippingPhone}</dd>
                </div>
              ) : null}
              {order.shippingAddress ? (
                <div>
                  <dt>Address</dt>
                  <dd>{order.shippingAddress}</dd>
                </div>
              ) : null}
              {order.remark ? (
                <div>
                  <dt>Remark</dt>
                  <dd>{order.remark}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {order.items.length ? (
            <DataTable
              columns={[
                {
                  key: "product",
                  header: "Product",
                  render: (i) => (
                    <>
                      <span className="cart-item-name">{i.productName}</span>
                      <br />
                      <span className="muted-text">
                        {i.variantName ? `${i.variantName} · ` : ""}
                        {i.sku}
                      </span>
                    </>
                  ),
                },
                {
                  key: "unitPrice",
                  header: "Unit price",
                  render: (i) => formatPrice(i.unitPrice),
                },
                {
                  key: "quantity",
                  header: "Qty",
                  render: (i) => String(i.quantity),
                },
                {
                  key: "subtotal",
                  header: "Subtotal",
                  render: (i) => formatPrice(i.subtotal),
                },
              ]}
              data={order.items}
              rowKey={(i) => i.id}
            />
          ) : (
            <p className="muted-text">No item snapshots for this order.</p>
          )}

          <div className="order-detail__footer">
            <div className="order-detail__total">
              <span>Total</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
            {canCancel ? (
              <button
                type="button"
                className="btn-danger"
                disabled={submitting}
                onClick={() => setCancelOpen(true)}
              >
                Cancel order
              </button>
            ) : null}
          </div>

          <Modal
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            title="Cancel this order?"
            confirmText="Yes, cancel"
            cancelText="Keep order"
            confirmVariant="danger"
            confirmDisabled={submitting}
            onConfirm={confirmCancel}
          >
            <p className="modal-tip">
              Only pending orders can be cancelled. This action can’t be undone,
              and the order will be marked <strong>Cancelled</strong>.
            </p>
          </Modal>
        </div>
      ) : null}
    </section>
  );
}
