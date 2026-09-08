import { apiRequest } from "./client";
import type {
  AdminVariant,
  CreateVariantInput,
  UpdateVariantInput,
} from "./types";

// ===== Admin SKU/变体管理（POST/PATCH/DELETE /variants/admin，ADMIN） =====
// 变体列表不单独请求：随 GET /admin/products/:id 的 variants 字段返回。

/** 后台创建 SKU */
export function createAdminVariant(
  input: CreateVariantInput,
): Promise<AdminVariant> {
  return apiRequest<AdminVariant>("variants/admin", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 后台更新 SKU（字段均可选；dealerPrice 传 null 可清空经销商价） */
export function updateAdminVariant(
  id: number,
  input: UpdateVariantInput,
): Promise<AdminVariant> {
  return apiRequest<AdminVariant>(`variants/admin/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** 后台删除 SKU */
export function deleteAdminVariant(id: number): Promise<void> {
  return apiRequest<void>(`variants/admin/${id}`, { method: "DELETE" });
}
