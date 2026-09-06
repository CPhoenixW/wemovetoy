import { apiRequest } from "./client";
import type { Cart, CartItem } from "./types";

/** 我的购物车（服务端解析商品名/SKU 名/价格/库存，价格绝不取自前端） */
export function getCart(): Promise<Cart> {
  return apiRequest<Cart>("cart");
}

/** 加购：后端要求 variantId（服务端定价/库存校验），不接受 product.id；返回更新后的该条目 */
export function addToCart(
  variantId: number,
  quantity: number,
): Promise<CartItem> {
  return apiRequest<CartItem>("cart/items", {
    method: "POST",
    body: JSON.stringify({ variantId, quantity }),
  });
}

/** 修改数量（服务端重新定价并校验库存），返回更新后的该条目 */
export function updateCartItem(
  itemId: number,
  quantity: number,
): Promise<CartItem> {
  return apiRequest<CartItem>(`cart/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(itemId: number): Promise<void> {
  return apiRequest(`cart/items/${itemId}`, { method: "DELETE" });
}

export function clearCart(): Promise<void> {
  return apiRequest("cart", { method: "DELETE" });
}
