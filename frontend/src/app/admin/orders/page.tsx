"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { listAdminOrders, updateAdminOrderStatus } from "@/lib/api/orders";
import type { AdminOrderListItem, OrderStatus } from "@/lib/api/types";
import { formatDate, formatPrice, orderStatusMap } from "@/lib/format";
import { ADMIN_ORDER_NEXT_ACTIONS as NEXT_ACTIONS } from "./order-actions";

const statusTabs: { label: string; value?: OrderStatus }[] = [
  { label: "全部" },
  { label: "待处理", value: "PENDING" },
  { label: "已支付", value: "PAID" },
  { label: "已发货", value: "SHIPPED" },
  { label: "已送达", value: "DELIVERED" },
  { label: "已完成", value: "COMPLETED" },
  { label: "已取消", value: "CANCELLED" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAdminOrders({ page, pageSize, search, status });
      setOrders(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages ?? Math.ceil(data.total / pageSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载订单失败");
    } finally {
      setLoading(false);
    }
  }, [search, status, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  // 切换筛选/搜索时回到第 1 页
  useEffect(() => {
    setPage(1);
  }, [status, search]);

  async function handleTransition(order: AdminOrderListItem, next: OrderStatus) {
    setBusyId(order.id);
    setError("");
    try {
      await updateAdminOrderStatus(order.id, next);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "状态更新失败");
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<AdminOrderListItem>[] = [
    {
      key: "orderNumber",
      header: "订单号",
      render: (row) => (
        <span className="order-number">{row.orderNumber}</span>
      ),
    },
    {
      key: "customer",
      header: "客户",
      render: (row) => (
        <div className="customer-cell">
          <span className="customer-name">
            {row.customer.name ?? "—"}
          </span>
          <span className="customer-email">{row.customer.email}</span>
        </div>
      ),
    },
    {
      key: "itemCount",
      header: "件数",
      className: "col-id",
      render: (row) => row.itemCount,
    },
    {
      key: "totalAmount",
      header: "金额",
      className: "col-price",
      render: (row) => formatPrice(row.totalAmount),
    },
    {
      key: "status",
      header: "状态",
      render: (row) => {
        const s = orderStatusMap[row.status];
        return s ? <StatusBadge status={s.status} label={s.label} /> : row.status;
      },
    },
    {
      key: "createdAt",
      header: "下单时间",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      header: "操作",
      className: "col-actions",
      render: (row) => {
        const actions = NEXT_ACTIONS[row.status] ?? [];
        // 操作列只展示「详情」+ 第一个最可能的下一步，其余在详情页完成
        const primary = actions[0];
        return (
          <div className="row-actions">
            <Link
              href={`/admin/orders/${row.id}`}
              className="link-secondary"
            >
              详情
            </Link>
            {primary ? (
              <button
                type="button"
                className={
                  primary.value === "CANCELLED" ? "link-danger" : "link-primary"
                }
                disabled={busyId === row.id}
                onClick={() => handleTransition(row, primary.value)}
              >
                {busyId === row.id ? "处理中..." : primary.label}
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>订单管理</h1>
          <p className="page-subtitle">共 {total} 个订单，搜索按订单号过滤</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="tab-row">
          {statusTabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              className={`tab-btn${status === tab.value ? " active" : ""}`}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="搜索订单号..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <p className="page-loading">加载中...</p>
      ) : (
        <DataTable<AdminOrderListItem>
          columns={columns}
          data={orders}
          rowKey={(row) => row.id}
          emptyTitle="没有符合条件的订单"
          emptyDescription="可调整状态筛选或搜索关键词"
        />
      )}

      {totalPages > 1 ? (
        <div className="pagination">
          <button
            type="button"
            className="btn-secondary page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <span className="page-info">
            第 {page} / {totalPages} 页，共 {total} 条
          </span>
          <button
            type="button"
            className="btn-secondary page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            下一页
          </button>
        </div>
      ) : null}
    </div>
  );
}
