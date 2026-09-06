import { apiRequest } from "./client";
import type {
  Paginated,
  Product,
  ProductInput,
  ProductQuery,
  ProductWithRelations,
} from "./types";

function buildQuery(query: ProductQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.sort) params.set("sort", query.sort);
  if (query.categoryId) params.set("categoryId", String(query.categoryId));
  if (query.status) params.set("status", query.status);
  if (query.search?.trim()) params.set("search", query.search.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** 商品列表（公开接口，Admin 列表页复用；待成员2补 Admin 专用列表契约） */
export function listProducts(query: ProductQuery = {}): Promise<Paginated<Product>> {
  return apiRequest(`products${buildQuery(query)}`);
}

/** 商品详情（通过 slug，仅 ACTIVE，含 variants） */
export function getProductBySlug(slug: string): Promise<ProductWithRelations> {
  return apiRequest(`products/${encodeURIComponent(slug)}`);
}

/** 后台商品详情（通过 id，ADMIN，含 variants） */
export function getAdminProduct(id: number): Promise<ProductWithRelations> {
  return apiRequest(`admin/products/${id}`);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return apiRequest("admin/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProduct(id: number, input: ProductInput): Promise<Product> {
  return apiRequest(`admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProduct(id: number): Promise<void> {
  return apiRequest(`admin/products/${id}`, { method: "DELETE" });
}

export function publishProduct(id: number): Promise<Product> {
  return apiRequest(`admin/products/${id}/publish`, { method: "POST" });
}
