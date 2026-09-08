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

/** 各状态下的“下一步”提示文案（只读展示，不产生动作） */
const NEXT_STEP: Record<string, string> = {
  PENDING: "商家将尽快确认并处理您的订单。",
  PAID: "已支付成功，等待商家发货。",
  SHIPPED: "商品已在配送途中，请留意收货。",
  DELIVERED: "已送达，请确认收货；如遇问题可联系商家。",
  COMPLETED: "订单已完成，感谢您的购买。",
  CANCELLED: "订单已取消；如需再次购买，可在商品页重新下单。",
};

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
      setError(err instanceof Error ? err.message : "订单加载失败");
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
      setNote("订单已取消。");
    } catch (err) {
      setCancelOpen(false);
      if (err instanceof ApiError && err.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/orders/${orderId}`)}`);
        return;
      }
      const message =
        err instanceof Error ? err.message : "取消订单失败";
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
          <p className="eyebrow">我的账户</p>
          <h1>订单详情</h1>
        </div>
        <Link href="/orders" className="link-secondary">
          ← 返回我的订单
        </Link>
      </div>

      {loading ? (
        <p className="page-loading">加载中…</p>
      ) : notFound ? (
        <EmptyState
          title="未找到该订单"
          description="该订单不存在或不属于当前账号。"
          action={
            <Link href="/orders" className="btn-primary">
              返回我的订单
            </Link>
          }
        />
      ) : error && !order ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>无法加载该订单</h3>
          <p>{error}</p>
          <div className="empty-action">
            <button type="button" className="btn-secondary" onClick={load}>
              重试
            </button>
            <Link href="/orders" className="btn-primary">
              返回我的订单
            </Link>
          </div>
        </div>
      ) : order ? (
        <div className="order-detail">
          {note ? <p className="form-success">{note}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <section className="order-hero" aria-label="订单概要">
            <div className="order-hero__top">
              <div className="order-hero__state">
                <StatusBadge
                  status={order.status}
                  label={ORDER_STATUS_LABEL[order.status]}
                />
                <p className="order-hero__next">{NEXT_STEP[order.status]}</p>
              </div>
              {canCancel ? (
                <button
                  type="button"
                  className="btn-danger"
                  disabled={submitting}
                  onClick={() => setCancelOpen(true)}
                >
                  取消订单
                </button>
              ) : null}
            </div>
            <dl className="order-hero__facts">
              <div>
                <dt>订单号</dt>
                <dd className="mono tnum">{order.orderNumber}</dd>
              </div>
              <div>
                <dt>下单时间</dt>
                <dd className="tnum">{formatDate(order.createdAt)}</dd>
              </div>
              <div className="order-hero__total">
                <dt>总金额</dt>
                <dd>
                  <strong className="tnum">{formatPrice(order.totalAmount)}</strong>
                </dd>
              </div>
            </dl>
          </section>

          {order.items.length ? (
            <section aria-label="商品清单">
              <h3 className="order-section-title">商品清单</h3>
              <DataTable
                columns={[
                  {
                    key: "product",
                    header: "商品",
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
                    header: "单价",
                    render: (i) => (
                      <span className="tnum">{formatPrice(i.unitPrice)}</span>
                    ),
                  },
                  {
                    key: "quantity",
                    header: "数量",
                    render: (i) => <span className="tnum">{i.quantity}</span>,
                  },
                  {
                    key: "subtotal",
                    header: "小计",
                    render: (i) => (
                      <span className="tnum">{formatPrice(i.subtotal)}</span>
                    ),
                  },
                ]}
                data={order.items}
                rowKey={(i) => i.id}
              />
            </section>
          ) : (
            <p className="muted-text">暂无该订单的商品快照。</p>
          )}

          {order.shippingName ||
          order.shippingPhone ||
          order.shippingAddress ||
          order.remark ? (
            <section className="order-secondary" aria-label="配送与备注">
              <h3 className="order-section-title">配送与备注</h3>
              <dl className="order-meta">
                {order.shippingName ? (
                  <div>
                    <dt>收货人</dt>
                    <dd>{order.shippingName}</dd>
                  </div>
                ) : null}
                {order.shippingPhone ? (
                  <div>
                    <dt>联系电话</dt>
                    <dd>{order.shippingPhone}</dd>
                  </div>
                ) : null}
                {order.shippingAddress ? (
                  <div>
                    <dt>收货地址</dt>
                    <dd>{order.shippingAddress}</dd>
                  </div>
                ) : null}
                {order.remark ? (
                  <div>
                    <dt>备注</dt>
                    <dd>{order.remark}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          <Modal
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            title="确认取消该订单？"
            confirmText="确认取消"
            cancelText="保留订单"
            confirmVariant="danger"
            confirmDisabled={submitting}
            onConfirm={confirmCancel}
          >
            <p className="modal-tip">
              仅「待处理」订单可取消。此操作不可撤销，订单将标记为{" "}
              <strong>已取消</strong>。
            </p>
          </Modal>
        </div>
      ) : null}
    </section>
  );
}
