"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import {
  deleteProduct,
  listAdminProducts,
  publishProduct,
} from "@/lib/api/products";
import type { AdminProduct, ProductStatus } from "@/lib/api/types";
import { formatPrice, productStatusMap } from "@/lib/format";

const statusTabs: { label: string; value?: ProductStatus }[] = [
  { label: "全部" },
  { label: "上架中", value: "ACTIVE" },
  { label: "已下架", value: "ARCHIVED" },
  { label: "草稿", value: "DRAFT" },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAdminProducts({ limit: pageSize, page, search, status });
      setProducts(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages ?? Math.ceil(data.total / pageSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载商品失败");
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

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  async function handlePublish(product: AdminProduct) {
    setPublishingId(product.id);
    setError("");
    try {
      await publishProduct(product.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setPublishingId(null);
    }
  }

  const columns: Column<AdminProduct>[] = [
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
          {row.status === "DRAFT" && (
            <button
              type="button"
              className="link-primary"
              disabled={publishingId === row.id}
              onClick={() => handlePublish(row)}
            >
              {publishingId === row.id ? "发布中..." : "发布"}
            </button>
          )}
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

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">管理后台</p>
          <h1>商品管理</h1>
          <p className="page-subtitle">共 {total} 个商品，搜索按名称、描述过滤</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary">
          + 新增商品
        </Link>
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
        <DataTable<AdminProduct>
          columns={columns}
          data={products}
          rowKey={(row) => row.id}
          emptyTitle="没有符合条件的商品"
          emptyDescription="可调整筛选条件，或点击右上角「新增商品」"
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
          删除为软删除，前台将不再展示。
        </p>
      </Modal>
    </div>
  );
}
