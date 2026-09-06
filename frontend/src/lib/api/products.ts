import { apiRequest } from "./client";
import type {
  ProductDetail,
  ProductListQuery,
  ProductListResult,
} from "./types";

export async function listProducts(
  query: ProductListQuery = {},
): Promise<ProductListResult> {
  const params = new URLSearchParams();
  if (query.page != null) params.set("page", String(query.page));
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.sort) params.set("sort", query.sort);
  if (query.categoryId != null) params.set("categoryId", String(query.categoryId));
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("search", query.search);

  const qs = params.toString();
  return apiRequest<ProductListResult>(`products${qs ? `?${qs}` : ""}`);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
  const product = await apiRequest<ProductDetail>(
    `products/${encodeURIComponent(slug)}`,
  );

  // 详情接口的 variants 直接来自 Prisma，price/dealerPrice 是 Decimal、
  // 序列化后为字符串；这里统一转成 number，避免前端按数字渲染时出错。
  return {
    ...product,
    variants: (product.variants ?? []).map((variant) => ({
      ...variant,
      price: Number(variant.price),
      dealerPrice:
        variant.dealerPrice == null ? null : Number(variant.dealerPrice),
    })),
  };
}
