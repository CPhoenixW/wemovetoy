import type { OrderStatus } from "@/lib/api/types";

/**
 * Admin 订单状态流转动作，与后端 STATUS_TRANSITIONS 一致：
 * PENDING→PAID/CANCELLED、PAID→SHIPPED/CANCELLED、
 * SHIPPED→DELIVERED、DELIVERED→COMPLETED
 */
export const ADMIN_ORDER_NEXT_ACTIONS: Partial<
  Record<OrderStatus, { value: OrderStatus; label: string }[]>
> = {
  PENDING: [
    { value: "PAID", label: "确认收款" },
    { value: "CANCELLED", label: "取消订单" },
  ],
  PAID: [
    { value: "SHIPPED", label: "发货" },
    { value: "CANCELLED", label: "取消订单" },
  ],
  SHIPPED: [{ value: "DELIVERED", label: "确认送达" }],
  DELIVERED: [{ value: "COMPLETED", label: "完成订单" }],
};
