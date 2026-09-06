"use client";

import { useState } from "react";
import { FormField } from "@/components/ui/form-field";
import type { AdminProductDetail, ProductInput, ProductStatus } from "@/lib/api/types";

interface ProductFormProps {
  initial?: AdminProductDetail;
  submitText: string;
  onSubmit: (input: ProductInput) => Promise<void>;
}

const STATUS_OPTIONS: Array<{ value: ProductStatus; label: string }> = [
  { value: "DRAFT", label: "草稿" },
  { value: "ACTIVE", label: "上架" },
  { value: "INACTIVE", label: "下架" },
];

export function ProductForm({ initial, submitText, onSubmit }: ProductFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    shortDescription: initial?.shortDescription ?? "",
    description: initial?.description ?? "",
    price: initial?.price != null ? String(initial.price) : "",
    dealerPrice: initial?.dealerPrice != null ? String(initial.dealerPrice) : "",
    categoryId: initial?.categoryId != null ? String(initial.categoryId) : "",
    ageMin: initial?.ageMin != null ? String(initial.ageMin) : "",
    ageMax: initial?.ageMax != null ? String(initial.ageMax) : "",
    playEnvironment: initial?.playEnvironment ?? "",
    status: (initial?.status ?? "DRAFT") as ProductStatus,
    features: Array.isArray(initial?.features) ? (initial.features as string[]).join(", ") : "",
    specifications:
      initial?.specifications && Object.keys(initial.specifications as object).length > 0
        ? JSON.stringify(initial.specifications, null, 2)
        : "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(name: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.slug.trim() || !form.shortDescription.trim() || !form.description.trim()) {
      setError("请填写必填项");
      return;
    }
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price < 0) {
      setError("请填写有效的零售价");
      return;
    }

    let specifications: Record<string, unknown> | undefined;
    if (form.specifications.trim()) {
      try {
        specifications = JSON.parse(form.specifications);
      } catch {
        setError("规格 JSON 格式不正确");
        return;
      }
    }

    const input: ProductInput = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      price,
      status: form.status,
    };
    if (form.dealerPrice.trim()) input.dealerPrice = Number(form.dealerPrice);
    if (form.categoryId.trim()) input.categoryId = Number(form.categoryId);
    if (form.ageMin.trim()) input.ageMin = Number(form.ageMin);
    if (form.ageMax.trim()) input.ageMax = Number(form.ageMax);
    if (form.playEnvironment.trim()) input.playEnvironment = form.playEnvironment.trim();
    if (form.features.trim()) {
      input.features = form.features.split(",").map((f) => f.trim()).filter(Boolean);
    }
    if (specifications) input.specifications = specifications;

    setSubmitting(true);
    try {
      await onSubmit(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请重试");
      setSubmitting(false);
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <FormField
          label="商品名称"
          name="name"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="例如：WEMOVE 运动滑板 Pro"
        />
        <FormField
          label="Slug（URL 标识）"
          name="slug"
          required
          value={form.slug}
          onChange={(e) => set("slug", e.target.value)}
          placeholder="例如：wemove-skateboard-pro"
        />
      </div>

      <FormField
        label="简短描述"
        name="shortDescription"
        required
        value={form.shortDescription}
        onChange={(e) => set("shortDescription", e.target.value)}
        placeholder="列表页展示的一句话简介"
      />

      <FormField
        label="详细描述"
        name="description"
        as="textarea"
        required
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
      />

      <div className="form-grid">
        <FormField
          label="零售价（元）"
          name="price"
          type="number"
          required
          value={form.price}
          onChange={(e) => set("price", e.target.value)}
        />
        <FormField
          label="经销商价（元，留空表示无）"
          name="dealerPrice"
          type="number"
          value={form.dealerPrice}
          onChange={(e) => set("dealerPrice", e.target.value)}
        />
      </div>

      <div className="form-grid">
        <FormField
          label="分类 ID（可选）"
          name="categoryId"
          type="number"
          value={form.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          placeholder="例如：1"
        />
        <FormField
          label="状态"
          name="status"
          as="select"
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </FormField>
      </div>

      <div className="form-grid">
        <FormField
          label="最小适用年龄"
          name="ageMin"
          type="number"
          value={form.ageMin}
          onChange={(e) => set("ageMin", e.target.value)}
        />
        <FormField
          label="最大适用年龄"
          name="ageMax"
          type="number"
          value={form.ageMax}
          onChange={(e) => set("ageMax", e.target.value)}
        />
      </div>

      <FormField
        label="游玩环境（可选）"
        name="playEnvironment"
        value={form.playEnvironment}
        onChange={(e) => set("playEnvironment", e.target.value)}
        placeholder="例如：户外 / 室内"
      />

      <FormField
        label="商品特性（英文逗号分隔，可选）"
        name="features"
        value={form.features}
        onChange={(e) => set("features", e.target.value)}
        placeholder="七层枫木甲板, 加固支架"
      />

      <FormField
        label="规格（JSON，可选）"
        name="specifications"
        as="textarea"
        value={form.specifications}
        onChange={(e) => set("specifications", e.target.value)}
        placeholder='{"材质": "加拿大枫木"}'
      />

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "提交中..." : submitText}
      </button>
    </form>
  );
}
