"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProductForm } from "../product-form";
import { createProduct } from "@/lib/api/products";
import type { ProductInput } from "@/lib/api/types";

export default function NewProductPage() {
  const router = useRouter();

  async function handleSubmit(input: ProductInput) {
    const product = await createProduct(input);
    router.push(`/admin/products/${product.id}/edit`);
    router.refresh();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">管理后台</p>
          <h1>新增商品</h1>
          <p className="page-subtitle">创建后可继续编辑详情与发布</p>
        </div>
        <Link href="/admin/products" className="link-secondary">
          ← 返回商品列表
        </Link>
      </div>

      <ProductForm submitText="创建商品" onSubmit={handleSubmit} />
    </div>
  );
}
