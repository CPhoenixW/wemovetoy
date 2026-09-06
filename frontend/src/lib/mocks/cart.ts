/**
 * TODO(依赖成员3): 后端目前没有 Admin 订单列表接口（GET /orders 仅返回当前
 * 用户自己的订单，见 P1-5）。待成员 3 定义 Admin 订单列表契约后，删除此
 * mock 并在 Admin 订单页接入真实 API。
 */

export interface MockOrder {
  id: number;
  orderNumber: string;
  companyName?: string; // Dealer 下单才有
  customerEmail: string;
  totalAmount: number;
  itemCount: number;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  createdAt: string;
  isDealer: boolean;
}

export const mockOrders: MockOrder[] = [
  {
    id: 1001,
    orderNumber: "WM-20260901-0001",
    companyName: "北京乐活体育",
    customerEmail: "contact@lehuo-sport.cn",
    totalAmount: 3294.0,
    itemCount: 8,
    status: "SHIPPED",
    createdAt: "2026-09-01T10:00:00Z",
    isDealer: true,
  },
  {
    id: 1002,
    orderNumber: "WM-20260902-0002",
    customerEmail: "user@gmail.com",
    totalAmount: 399.0,
    itemCount: 1,
    status: "DELIVERED",
    createdAt: "2026-09-02T14:30:00Z",
    isDealer: false,
  },
  {
    id: 1003,
    orderNumber: "WM-20260903-0003",
    customerEmail: "parent@qq.com",
    totalAmount: 688.0,
    itemCount: 2,
    status: "PAID",
    createdAt: "2026-09-03T09:15:00Z",
    isDealer: false,
  },
  {
    id: 1004,
    orderNumber: "WM-20260904-0004",
    companyName: "深圳运动达人",
    customerEmail: "ceo@sportmaster.cn",
    totalAmount: 8991.0,
    itemCount: 12,
    status: "PENDING",
    createdAt: "2026-09-04T11:20:00Z",
    isDealer: true,
  },
  {
    id: 1005,
    orderNumber: "WM-20260905-0005",
    customerEmail: "test@test.com",
    totalAmount: 0,
    itemCount: 1,
    status: "CANCELLED",
    createdAt: "2026-09-05T08:00:00Z",
    isDealer: false,
  },
];
