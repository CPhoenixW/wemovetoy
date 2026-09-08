"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import { getAdminOrder, updateAdminOrderStatus } from "@/lib/api/orders";
import type { AdminOrderDetail, OrderItem, OrderStatus } from "@/lib/api/types";
import { formatDate, formatPrice, orderStatusMap } from "@/lib/format";
import { ADMIN_ORDER_NEXT_ACTIONS as NEXT_ACTIONS } from "../order-actions";

const roleLabels: Record<string, string> = {
  ADMIN: "管理员",
  DEALER: "经销商",
  USER: "普通用户",
};

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [note, setNote] = useState("");
  const [busyAction, setBusyAction] = useState<OrderStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrder(await getAdminOrder(orderId));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace(
            `/login?next=${encodeURIComponent(`/admin/orders/${orderId}`)}`,
          );
          return;
        }
        if (err.status === 403 || err.status === 404) {
          setNotFound(true);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "加载订单失败");
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

  async function handleTransition(next: OrderStatus) {
    if (busyAction) return;
    setBusyAction(next);
    setError("");
    setNote("");
    try {
      const updated = await updateAdminOrderStatus(orderId, next);
      // 流转接口返回最新订单（不含 customer），合并保留客户信息
      setOrder((prev) => (prev ? { ...prev, ...updated } : prev));
      const label = orderStatusMap[next]?.label ?? next;
      setNote(`订单状态已更新为「${label}」`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "状态更新失败");
    } finally {
      setBusyAction(null);
    }
  }

  const itemColumns: Column<OrderItem>[] = [
    {
      key: "product",
      header: "商品",
      render: (item) => (
        <>
          <span className="cart-item-name">{item.productName}</span>
          <br />
          <span className="muted-text">
            {item.variantName ? `${item.variantName} · ` : ""}
            {item.sku}
          </span>
        </>
      ),
    },
    {
      key: "unitPrice",
      header: "单价",
      className: "col-price",
      render: (item) => formatPrice(item.unitPrice),
    },
    {
      key: "quantity",
      header: "数量",
      className: "col-id",
      render: (item) => item.quantity,
    },
    {
      key: "subtotal",
      header: "小计",
      className: "col-price",
      render: (item) => formatPrice(item.subtotal),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>订单详情</h1>
        </div>
        <Link href="/admin/orders" className="link-secondary">
          ← 返回订单列表
        </Link>
      </div>

      {loading ? (
        <p className="page-loading">加载中...</p>
      ) : notFound ? (
        <EmptyState
          title="订单不存在"
          description="该订单不存在，或你没有权限查看。"
          action={
            <Link href="/admin/orders" className="btn-primary">
              返回订单列表
            </Link>
          }
        />
      ) : error && !order ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>订单加载失败</h3>
          <p>{error}</p>
          <div className="empty-action">
            <button type="button" className="btn-secondary" onClick={load}>
              重试
            </button>
            <Link href="/admin/orders" className="btn-primary">
              返回订单列表
            </Link>
          </div>
        </div>
      ) : order ? (
        <div className="order-detail">
          {note ? <p className="form-success">{note}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <div className="order-detail__head">
            <span className="mono">{order.orderNumber}</span>
            {orderStatusMap[order.status] ? (
              <StatusBadge
                status={orderStatusMap[order.status].status}
                label={orderStatusMap[order.status].label}
              />
            ) : (
              <StatusBadge status="default" label={order.status} />
            )}
            <span className="muted-text">下单 {formatDate(order.createdAt)}</span>
          </div>

          <dl className="order-meta">
            <div>
              <dt>客户</dt>
              <dd>
                {order.customer.name
                  ? `${order.customer.name}（${order.customer.email}）`
                  : order.customer.email}
              </dd>
            </div>
            <div>
              <dt>客户类型</dt>
              <dd>{roleLabels[order.customer.role] ?? order.customer.role}</dd>
            </div>
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
                <dt>订单备注</dt>
                <dd>{order.remark}</dd>
              </div>
            ) : null}
          </dl>

          {order.items.length ? (
            <DataTable<OrderItem>
              columns={itemColumns}
              data={order.items}
              rowKey={(item) => item.id}
            />
          ) : (
            <p className="muted-text">该订单没有商品快照。</p>
          )}

          <div className="order-detail__footer">
            <div className="order-detail__total">
              <span>订单总额</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
            <div className="row-actions">
              {(NEXT_ACTIONS[order.status] ?? []).map((action) => (
                <button
                  key={action.value}
                  type="button"
                  className={
                    action.value === "CANCELLED" ? "btn-danger" : "btn-primary"
                  }
                  disabled={busyAction !== null}
                  onClick={() => handleTransition(action.value)}
                >
                  {busyAction === action.value ? "处理中..." : action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
