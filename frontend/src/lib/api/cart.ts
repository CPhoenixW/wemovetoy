import { apiRequest } from "./client";
import type { Cart, CartItem } from "./types";

export function getCart(): Promise<Cart> {
  return apiRequest("cart");
}

/** 后端要求 variantId（服务端定价），不接受 product.id */
export function addToCart(variantId: number, quantity: number): Promise<CartItem> {
  return apiRequest("cart/items", {
    method: "POST",
    body: JSON.stringify({ variantId, quantity }),
  });
}

export function updateCartItem(itemId: number, quantity: number): Promise<CartItem> {
  return apiRequest(`cart/items/${itemId}`, {
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
