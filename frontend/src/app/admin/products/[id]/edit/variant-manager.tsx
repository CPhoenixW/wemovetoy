"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import {
  createAdminVariant,
  deleteAdminVariant,
  updateAdminVariant,
} from "@/lib/api/variants";
import type {
  AdminProductVariant,
  AdminVariant,
  VariantStatus,
} from "@/lib/api/types";
import { formatPrice } from "@/lib/format";

/** GET /admin/products/:id 返回的变体（Decimal 可能是字符串）归一化为 AdminVariant */
function normalizeVariant(v: AdminProductVariant): AdminVariant {
  const stock = Number(v.stock ?? 0);
  const reserved = Number(v.reserved ?? 0);
  const availableStock = Math.max(0, stock - reserved);
  const status: VariantStatus = v.status === "ACTIVE" ? "ACTIVE" : "INACTIVE";
  return {
    id: v.id,
    sku: v.sku,
    name: v.name,
    options: v.options ?? null,
    price: Number(v.price),
    dealerPrice:
      v.dealerPrice === null || v.dealerPrice === undefined
        ? null
        : Number(v.dealerPrice),
    stock,
    reserved,
    availableStock,
    status,
    isPurchasable: status === "ACTIVE" && availableStock > 0,
  };
}

interface VariantFormValues {
  sku: string;
  name: string;
  price: string;
  dealerPrice: string;
  stock: string;
  status: VariantStatus;
  options: string;
}

function toFormValues(v: AdminVariant | null): VariantFormValues {
  return {
    sku: v?.sku ?? "",
    name: v?.name ?? "",
    price: v ? String(v.price) : "",
    dealerPrice: v?.dealerPrice != null ? String(v.dealerPrice) : "",
    stock: v ? String(v.stock) : "0",
    status: v?.status ?? "ACTIVE",
    options: v?.options ? JSON.stringify(v.options, null, 2) : "",
  };
}

// ============ 新增/编辑 SKU 弹窗（定义在模块顶层，避免输入框随父渲染失焦） ============

interface VariantFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initial: AdminVariant | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: VariantFormValues) => Promise<void>;
}

function VariantFormModal({
  open,
  mode,
  initial,
  submitting,
  onClose,
  onSubmit,
}: VariantFormModalProps) {
  const [form, setForm] = useState<VariantFormValues>(() =>
    toFormValues(initial),
  );
  const [error, setError] = useState("");

  function set(name: keyof VariantFormValues, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleConfirm() {
    setError("");
    if (!form.sku.trim() || !form.name.trim()) {
      setError("请填写 SKU 编码和规格名称");
      return;
    }
    const price = Number(form.price);
    if (!form.price.trim() || Number.isNaN(price) || price < 0) {
      setError("请填写有效的零售价");
      return;
    }
    const stock = form.stock.trim() === "" ? 0 : Number(form.stock);
    if (Number.isNaN(stock) || stock < 0) {
      setError("库存必须是不小于 0 的数字");
      return;
    }
    if (form.dealerPrice.trim() !== "") {
      const dealerPrice = Number(form.dealerPrice);
      if (Number.isNaN(dealerPrice) || dealerPrice < 0) {
        setError("经销商价必须是不小于 0 的数字");
        return;
      }
    }
    if (form.options.trim() !== "") {
      try {
        const parsed = JSON.parse(form.options);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setError("规格必须是 JSON 对象，例如 {\"颜色\": \"红色\"}");
          return;
        }
      } catch {
        setError("规格 JSON 格式不正确");
        return;
      }
    }

    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试");
    }
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "新增 SKU" : "编辑 SKU"}
      confirmText={submitting ? "保存中..." : mode === "create" ? "创建" : "保存修改"}
      confirmDisabled={submitting}
      onConfirm={handleConfirm}
    >
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="variant-sku">
            SKU 编码<span className="required"> *</span>
          </label>
          <input
            id="variant-sku"
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
            placeholder="例如：WMS-PRO-RED"
            disabled={submitting}
          />
        </div>
        <div className="form-field">
          <label htmlFor="variant-name">
            规格名称<span className="required"> *</span>
          </label>
          <input
            id="variant-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="例如：红色 / 标准版"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="variant-price">
            零售价（元）<span className="required"> *</span>
          </label>
          <input
            id="variant-price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="form-field">
          <label htmlFor="variant-dealer-price">经销商价（元，留空表示无）</label>
          <input
            id="variant-dealer-price"
            type="number"
            min="0"
            step="0.01"
            value={form.dealerPrice}
            onChange={(e) => set("dealerPrice", e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="variant-stock">库存数量</label>
          <input
            id="variant-stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={(e) => set("stock", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="form-field">
          <label htmlFor="variant-status">状态</label>
          <select
            id="variant-status"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            disabled={submitting}
          >
            <option value="ACTIVE">启用</option>
            <option value="INACTIVE">停用</option>
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="variant-options">规格属性（JSON，可选）</label>
        <textarea
          id="variant-options"
          rows={3}
          value={form.options}
          onChange={(e) => set("options", e.target.value)}
          placeholder='{"颜色": "红色", "尺寸": "标准版"}'
          disabled={submitting}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}
    </Modal>
  );
}

// ============ SKU 管理区 ============

interface VariantManagerProps {
  productId: number;
  initialVariants: AdminProductVariant[];
}

export function VariantManager({
  productId,
  initialVariants,
}: VariantManagerProps) {
  const [variants, setVariants] = useState<AdminVariant[]>(() =>
    initialVariants.map(normalizeVariant),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminVariant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminVariant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(variant: AdminVariant) {
    setEditing(variant);
    setFormOpen(true);
  }

  function closeForm() {
    if (submitting) return;
    setFormOpen(false);
    setEditing(null);
  }

  function parseOptions(text: string): Record<string, string> | null {
    if (!text.trim()) return null;
    return JSON.parse(text) as Record<string, string>;
  }

  async function handleSubmit(values: VariantFormValues) {
    setSubmitting(true);
    const options = parseOptions(values.options);
    try {
      if (editing) {
        const updated = await updateAdminVariant(editing.id, {
          sku: values.sku.trim(),
          name: values.name.trim(),
          price: Number(values.price),
          // 留空传 null 清空经销商价
          dealerPrice: values.dealerPrice.trim()
            ? Number(values.dealerPrice)
            : null,
          stock: values.stock.trim() === "" ? 0 : Number(values.stock),
          status: values.status,
          options,
        });
        setVariants((prev) =>
          prev.map((v) => (v.id === updated.id ? normalizeFromApi(updated) : v)),
        );
      } else {
        const created = await createAdminVariant({
          productId,
          sku: values.sku.trim(),
          name: values.name.trim(),
          price: Number(values.price),
          dealerPrice: values.dealerPrice.trim()
            ? Number(values.dealerPrice)
            : undefined,
          stock: values.stock.trim() === "" ? 0 : Number(values.stock),
          status: values.status,
          options: options ?? undefined,
        });
        setVariants((prev) => [...prev, normalizeFromApi(created)]);
      }
      setFormOpen(false);
      setEditing(null);
    } finally {
      // 失败时错误向上抛给弹窗内 catch 展示，弹窗保持打开可重试
      setSubmitting(false);
    }
  }

  /** CRUD 接口返回的 AdminVariant 补齐本地派生字段 */
  function normalizeFromApi(v: AdminVariant): AdminVariant {
    const availableStock = Math.max(0, v.stock - v.reserved);
    return {
      ...v,
      availableStock,
      isPurchasable: v.status === "ACTIVE" && availableStock > 0,
    };
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAdminVariant(deleteTarget.id);
      setVariants((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除 SKU 失败");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<AdminVariant>[] = [
    { key: "sku", header: "SKU 编码" },
    { key: "name", header: "规格名称" },
    {
      key: "options",
      header: "规格属性",
      render: (row) => {
        const entries = row.options ? Object.entries(row.options) : [];
        if (entries.length === 0) return <span className="muted-text">—</span>;
        return (
          <span className="variant-options">
            {entries.map(([key, value]) => (
              <span className="variant-option-tag" key={key}>
                {key}: {String(value)}
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: "price",
      header: "零售价",
      className: "col-price",
      render: (row) => formatPrice(row.price),
    },
    {
      key: "dealerPrice",
      header: "经销商价",
      className: "col-price",
      render: (row) =>
        row.dealerPrice != null ? formatPrice(row.dealerPrice) : "—",
    },
    {
      key: "stock",
      header: "库存",
      className: "col-id",
      render: (row) => `${row.stock}（可用 ${row.availableStock}）`,
    },
    {
      key: "status",
      header: "状态",
      render: (row) =>
        row.isPurchasable ? (
          <StatusBadge status="active" label="可售" />
        ) : (
          <StatusBadge
            status={row.status === "ACTIVE" ? "pending" : "inactive"}
            label={row.status === "ACTIVE" ? "缺货" : "已停用"}
          />
        ),
    },
    {
      key: "actions",
      header: "操作",
      className: "col-actions",
      render: (row) => (
        <div className="row-actions">
          <button
            type="button"
            className="link-primary"
            onClick={() => openEdit(row)}
          >
            编辑
          </button>
          <button
            type="button"
            className="link-danger"
            onClick={() => setDeleteTarget(row)}
          >
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="variant-manager" aria-labelledby="variant-manager-title">
      <div className="page-header">
        <div>
          <h2 id="variant-manager-title">SKU 管理</h2>
          <p className="page-subtitle">
            共 {variants.length} 个 SKU；官网详情页的规格选择与加购依赖这里的启用且有库存的 SKU
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreate}>
          + 新增 SKU
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <DataTable<AdminVariant>
        columns={columns}
        data={variants}
        rowKey={(row) => row.id}
        emptyTitle="该商品还没有 SKU"
        emptyDescription="点击右上角「新增 SKU」创建规格；没有可售 SKU 的商品无法在官网加购"
      />

      {/* key 保证新增/编辑切换时表单状态重置 */}
      <VariantFormModal
        key={editing ? `edit-${editing.id}` : "create"}
        open={formOpen}
        mode={editing ? "edit" : "create"}
        initial={editing}
        submitting={submitting}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除 SKU"
        confirmText={deleting ? "删除中..." : "删除"}
        cancelText="取消"
        confirmVariant="danger"
        confirmDisabled={deleting}
        onConfirm={handleConfirmDelete}
      >
        <p>
          确定要删除 SKU <strong>{deleteTarget?.sku}</strong>（
          {deleteTarget?.name}）吗？删除后含该 SKU 的历史订单不受影响。
        </p>
      </Modal>
    </section>
  );
}
