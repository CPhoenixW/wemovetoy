import type { OrderStatus } from "./api/types";

/** 公开店（英文）订单状态标签；颜色色板由 StatusBadge 按 status 自行取用 */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
