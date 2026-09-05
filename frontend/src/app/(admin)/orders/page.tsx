"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  mockOrders,
  orderStatusMap,
  type MockOrder,
} from "@/lib/mocks/cart";
import { formatPrice } from "@/lib/mocks/products";

const STATUS_TABS: Array<{ key: string; label: string }> = [
  { key: "ALL", label: "全部" },
  { key: "PENDING", label: "待处理" },
  { key: "PAID", label: "已支付" },
  { key: "SHIPPED", label: "已发货" },
  { key: "DELIVERED", label: "已送达" },
  { key: "CANCELLED", label: "已取消" },
];

export default function AdminOrdersPage() {
  const [orders] = useState<MockOrder[]>(mockOrders);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = orders;
    if (status !== "ALL") {
      result = result.filter((o) => o.status === status);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          (o.companyName ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [orders, status, search]);

  const columns: Column<MockOrder>[] = [
    {
      key: "orderNumber",
      header: "订单号",
      render: (row) => (
        <span className="mono">{row.orderNumber}</span>
      ),
    },
    {
      key: "buyer",
      header: "买家",
      render: (row) => (
        <div>
          <div className="order-buyer-email">{row.customerEmail}</div>
          {row.isDealer && row.companyName ? (
            <span className="order-dealer-tag">🏢 {row.companyName}</span>
          ) : (
            <span className="order-user-tag">👤 普通用户</span>
          )}
        </div>
      ),
    },
    { key: "itemCount", header: "商品数" },
    {
      key: "totalAmount",
      header: "金额",
      render: (row) => formatPrice(row.totalAmount),
      className: "col-price",
    },
    {
      key: "status",
      header: "状态",
      render: (row) => {
        const s = orderStatusMap[row.status];
        return <StatusBadge status={s.status} label={s.label} />;
      },
    },
    {
      key: "createdAt",
      header: "下单时间",
      render: (row) =>
        new Date(row.createdAt).toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>订单管理</h1>
          <p className="page-subtitle">
            共 {filtered.length} 笔订单，总金额 {formatPrice(filtered.reduce((s, o) => s + o.totalAmount, 0))}
          </p>
        </div>
      </div>

      <div className="toolbar orders-toolbar">
        <input
          type="text"
          placeholder="搜索订单号、邮箱或公司名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="filter-tabs orders-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`filter-tab ${status === tab.key ? "active" : ""}`}
              onClick={() => setStatus(tab.key)}
            >
              {tab.label}
              <span className="filter-count">
                {tab.key === "ALL"
                  ? orders.length
                  : orders.filter((o) => o.status === tab.key).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <DataTable<MockOrder>
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        emptyTitle="没有订单"
        emptyDescription="当前筛选条件下没有匹配的订单"
      />
    </div>
  );
}
