import { apiRequest } from "./client";

// 阶段 A：仅加购动作（POST /cart/items 为既有稳定接口）。
// 购物车查询/改量/删除与富字段（productName/subtotal 等）待成员 3 合入后，
// 按契约 4.1 在阶段 B 补齐类型与页面。

/** 加购：后端要求 variantId（服务端定价/库存校验），不接受 product.id */
export function addToCart(
  variantId: number,
  quantity: number,
): Promise<unknown> {
  return apiRequest("cart/items", {
    method: "POST",
    body: JSON.stringify({ variantId, quantity }),
  });
}
