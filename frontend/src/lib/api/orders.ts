import { apiRequest } from "./client";
import type {
  AdminOrderListItem,
  AdminOrderQuery,
  CreateOrderInput,
  Order,
  OrderStatus,
  Paginated,
} from "./types";

// ===== 下单与我的订单（Dealer/USER） =====

/** 从购物车下单：服务端二次校验库存并保存名称/价格/SKU 快照，成功后清空购物车 */
export function createOrder(input: CreateOrderInput = {}): Promise<Order> {
  return apiRequest<Order>("orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 我的订单列表（本人可见，createdAt 倒序，分页） */
export function listMyOrders(
  query: { page?: number; pageSize?: number } = {},
): Promise<Paginated<Order>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return apiRequest<Paginated<Order>>(`orders${qs ? `?${qs}` : ""}`);
}

/** 我的订单详情（含商品快照；本人或 ADMIN 可见） */
export function getMyOrder(id: number): Promise<Order> {
  return apiRequest<Order>(`orders/${id}`);
}

/** 取消我待处理的订单（仅 status=PENDING 可取消） */
export function cancelMyOrder(id: number): Promise<Order> {
  return apiRequest<Order>(`orders/${id}/cancel`, { method: "PATCH" });
}

// ===== Admin 订单（GET/PATCH /admin/orders，ADMIN） =====

/** 后台订单列表（分页 + status + search 订单号） */
export function listAdminOrders(
  query: AdminOrderQuery = {},
): Promise<Paginated<AdminOrderListItem>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  if (query.search?.trim()) params.set("search", query.search.trim());
  const qs = params.toString();
  return apiRequest<Paginated<AdminOrderListItem>>(
    `admin/orders${qs ? `?${qs}` : ""}`,
  );
}

/** 后台订单详情（含快照明细与客户信息） */
export function getAdminOrder(id: number): Promise<Order> {
  return apiRequest<Order>(`admin/orders/${id}`);
}

/**
 * 后台流转订单状态。服务端仅允许：
 * PENDING→PAID/CANCELLED、PAID→SHIPPED/CANCELLED、
 * SHIPPED→DELIVERED、DELIVERED→COMPLETED
 */
export function updateAdminOrderStatus(
  id: number,
  status: OrderStatus,
): Promise<Order> {
  return apiRequest<Order>(`admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
