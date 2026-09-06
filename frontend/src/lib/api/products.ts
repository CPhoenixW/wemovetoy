import { apiRequest } from "./client";
import type {
  AdminProduct,
  AdminProductDetail,
  DealerProduct,
  Paginated,
  ProductInput,
  ProductQuery,
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

// ===== Admin 商品管理（GET/POST/PATCH/DELETE /admin/products，ADMIN） =====

/** 后台商品列表（含草稿/下架状态、经销商价，支持 status/search 过滤） */
export function listAdminProducts(
  query: ProductQuery = {},
): Promise<Paginated<AdminProduct>> {
  return apiRequest(`admin/products${buildQuery(query)}`);
}

/** 后台商品详情（通过 id，含 variants） */
export function getAdminProduct(id: number): Promise<AdminProductDetail> {
  return apiRequest(`admin/products/${id}`);
}

export function createProduct(input: ProductInput): Promise<AdminProduct> {
  return apiRequest("admin/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProduct(
  id: number,
  input: Partial<ProductInput>,
): Promise<AdminProduct> {
  return apiRequest(`admin/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteProduct(id: number): Promise<void> {
  return apiRequest(`admin/products/${id}`, { method: "DELETE" });
}

export function publishProduct(id: number): Promise<AdminProduct> {
  return apiRequest(`admin/products/${id}/publish`, { method: "POST" });
}

// ===== Dealer 商品目录（GET /dealer/products，DEALER） =====

/** 经销商商品目录：内联可售 variants（unitPrice/availableStock/isPurchasable） */
export function listDealerProducts(
  query: ProductQuery = {},
): Promise<Paginated<DealerProduct>> {
  return apiRequest(`dealer/products${buildQuery(query)}`);
}
