"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductForm } from "../../product-form";
import { VariantManager } from "./variant-manager";
import { getAdminProduct, updateProduct } from "@/lib/api/products";
import type { AdminProductDetail, ProductInput } from "@/lib/api/types";

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAdminProduct(Number(id))
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载商品失败");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(input: ProductInput) {
    const updated = await updateProduct(Number(id), input);
    setProduct((prev) => (prev ? { ...prev, ...updated } : prev));
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin Console</p>
          <h1>编辑商品</h1>
          <p className="page-subtitle">
            {product ? `正在编辑：${product.name}（ID: ${product.id}）` : `商品 ID: ${id}`}
          </p>
        </div>
        <Link href="/admin/products" className="link-secondary">
          ← 返回商品列表
        </Link>
      </div>

      {loading ? (
        <p className="page-loading">加载中...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : product ? (
        <>
          <ProductForm initial={product} submitText="保存修改" onSubmit={handleSubmit} />
          <VariantManager
            productId={product.id}
            productStatus={product.status}
            initialVariants={product.variants}
          />
        </>
      ) : null}
    </div>
  );
}
