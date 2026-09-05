"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import {
  mockProducts,
  productStatusMap,
  formatPrice,
  type MockProduct,
} from "@/lib/mocks/products";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<MockProduct[]>(mockProducts);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MockProduct | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q),
    );
  }, [products, search]);

  const columns: Column<MockProduct>[] = [
    { key: "id", header: "ID", className: "col-id" },
    {
      key: "name",
      header: "商品名称",
      render: (row) => (
        <Link
          href={`/admin/products/${row.id}`}
          className="link-primary"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "category",
      header: "分类",
      render: (row) => row.category?.name ?? "—",
    },
    {
      key: "price",
      header: "零售价",
      render: (row) => formatPrice(row.price),
      className: "col-price",
    },
    {
      key: "dealerPrice",
      header: "经销商价",
      render: (row) => formatPrice(row.dealerPrice),
      className: "col-price",
    },
    {
      key: "status",
      header: "状态",
      render: (row) => {
        const s = productStatusMap[row.status];
        return <StatusBadge status={s.status} label={s.label} />;
      },
    },
    {
      key: "actions",
      header: "操作",
      render: (row) => (
        <div className="row-actions">
          <Link href={`/admin/products/${row.id}`} className="link-primary">
            编辑
          </Link>
          <button
            type="button"
            className="link-danger"
            onClick={() => setDeleteTarget(row)}
          >
            删除
          </button>
        </div>
      ),
      className: "col-actions",
    },
  ];

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>商品管理</h1>
          <p className="page-subtitle">
            共 {filtered.length} 个商品，搜索可按名称、slug、描述过滤
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-primary">
          + 新增商品
        </Link>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="搜索商品..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      <DataTable<MockProduct>
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        emptyTitle="还没有商品"
        emptyDescription="点击右上角「新增商品」来创建第一个商品"
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除"
        confirmText="删除"
        cancelText="取消"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
      >
        <p>
          确定要删除商品 <strong>{deleteTarget?.name}</strong> 吗？
          此操作不可恢复。
        </p>
      </Modal>
    </div>
  );
}
