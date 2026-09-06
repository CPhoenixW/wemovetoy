"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { deleteProduct, listProducts } from "@/lib/api/products";
import type { Product } from "@/lib/api/types";
import { formatPrice, productStatusMap } from "@/lib/format";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listProducts({ limit: 100, search });
      setProducts(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载商品失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const columns: Column<Product>[] = [
    { key: "id", header: "ID", className: "col-id" },
    {
      key: "name",
      header: "商品名称",
      render: (row) => (
        <Link href={`/admin/products/${row.id}/edit`} className="link-primary">
          {row.name}
        </Link>
      ),
    },
    {
      key: "categoryId",
      header: "分类",
      render: (row) => (row.categoryId != null ? `#${row.categoryId}` : "—"),
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
        return s ? <StatusBadge status={s.status} label={s.label} /> : row.status;
      },
    },
    {
      key: "actions",
      header: "操作",
      render: (row) => (
        <div className="row-actions">
          <Link href={`/admin/products/${row.id}/edit`} className="link-primary">
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

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>商品管理</h1>
          <p className="page-subtitle">
            共 {products.length} 个商品，搜索按名称、描述过滤
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

      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <p className="page-loading">加载中...</p>
      ) : (
        <DataTable<Product>
          columns={columns}
          data={products}
          rowKey={(row) => row.id}
          emptyTitle="还没有商品"
          emptyDescription="点击右上角「新增商品」来创建第一个商品"
        />
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除"
        confirmText={deleting ? "删除中..." : "删除"}
        cancelText="取消"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
      >
        <p>
          确定要删除商品 <strong>{deleteTarget?.name}</strong> 吗？
          删除后前台将不再展示。
        </p>
      </Modal>
    </div>
  );
}
