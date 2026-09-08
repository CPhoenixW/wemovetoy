import { orderStatusMap } from "./format";
import type { OrderStatus } from "./api/types";

/** 公开店订单状态标签（中文）；颜色色板由 StatusBadge 按 status 自行取用 */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: orderStatusMap.PENDING.label,
  PAID: orderStatusMap.PAID.label,
  SHIPPED: orderStatusMap.SHIPPED.label,
  DELIVERED: orderStatusMap.DELIVERED.label,
  COMPLETED: orderStatusMap.COMPLETED.label,
  CANCELLED: orderStatusMap.CANCELLED.label,
};
