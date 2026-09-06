import { apiRequest } from "./client";
import type { CreateOrderInput, Order, OrderStatus } from "./types";

/** 从当前购物车创建订单（购物车会被后端清空） */
export function createOrder(input: CreateOrderInput = {}): Promise<Order> {
  return apiRequest("orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 当前登录用户自己的订单列表 */
export function getMyOrders(): Promise<Order[]> {
  return apiRequest("orders");
}

export function getOrder(id: number): Promise<Order> {
  return apiRequest(`orders/${id}`);
}

/** ADMIN：按状态机流转订单状态 */
export function updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
  return apiRequest(`orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
