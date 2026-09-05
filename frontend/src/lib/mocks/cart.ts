import { type MockProduct, formatPrice, mockProducts } from "./products";

export interface CartItem {
  product: MockProduct;
  quantity: number;
}

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

export const mockCartItems: CartItem[] = [
  { product: mockProducts[0], quantity: 2 }, // 滑板 x2
  { product: mockProducts[3], quantity: 1 }, // 弹跳杆 x1
  { product: mockProducts[5], quantity: 3 }, // 自行车 x3
];

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

// 计算购物车总价
export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const price = item.product.dealerPrice ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);
}

export function calculateCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

// Order → StatusBadge 映射
export const orderStatusMap: Record<string, { status: string; label: string }> = {
  PENDING: { status: "pending", label: "待处理" },
  PAID: { status: "active", label: "已支付" },
  SHIPPED: { status: "pending", label: "已发货" },
  DELIVERED: { status: "approved", label: "已送达" },
  CANCELLED: { status: "rejected", label: "已取消" },
};

// 单价计算（区分 dealer price）
export function getItemUnitPrice(item: CartItem): number {
  return item.product.dealerPrice ?? item.product.price;
}
