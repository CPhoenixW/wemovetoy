import type { AuthenticatedUser } from "@/lib/api/types";

// 对齐后端 SafeProduct 结构
export interface MockProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  dealerPrice: number | null;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  category: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const mockProducts: MockProduct[] = [
  {
    id: 1,
    name: "WEMOVE 运动滑板 Pro",
    slug: "wemove-skateboard-pro",
    shortDescription: "专业级户外运动滑板，适合 6-14 岁儿童",
    description: "高品质滑板，七层加拿大枫木甲板，加固支架...",
    price: 399.0,
    dealerPrice: 299.0,
    status: "ACTIVE",
    category: { id: 1, name: "户外玩具" },
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-03T14:30:00Z",
  },
  {
    id: 2,
    name: "WEMOVE 平衡车 R1",
    slug: "wemove-balance-r1",
    shortDescription: "智能体感平衡车，亲子互动首选",
    description: "内置姿态传感器，自动平衡，续航 25km...",
    price: 1299.0,
    dealerPrice: 999.0,
    status: "ACTIVE",
    category: { id: 1, name: "户外玩具" },
    createdAt: "2026-09-01T10:05:00Z",
    updatedAt: "2026-09-02T09:15:00Z",
  },
  {
    id: 3,
    name: "WEMOVE 折叠滑板车",
    slug: "wemove-scooter-fold",
    shortDescription: "一键折叠，便携出行",
    description: "航空铝合金车架，5 秒折叠，轻便好带...",
    price: 259.0,
    dealerPrice: null,
    status: "INACTIVE",
    category: { id: 1, name: "户外玩具" },
    createdAt: "2026-08-28T09:00:00Z",
    updatedAt: "2026-09-04T16:00:00Z",
  },
  {
    id: 4,
    name: "WEMOVE 弹跳杆",
    slug: "wemove-pogo-stick",
    shortDescription: "弹力升级，安全防护",
    description: "升级弹簧系统，最高弹跳 1.2 米...",
    price: 189.0,
    dealerPrice: 149.0,
    status: "ACTIVE",
    category: { id: 2, name: "极限运动" },
    createdAt: "2026-09-02T11:00:00Z",
    updatedAt: "2026-09-03T10:00:00Z",
  },
  {
    id: 5,
    name: "WEMOVE 飞盘套装",
    slug: "wemove-frisbee-set",
    shortDescription: "亲子飞盘三件套，夜光设计",
    description: "夜光材料，夜晚也能玩，适合全家...",
    price: 89.0,
    dealerPrice: null,
    status: "DRAFT",
    category: null,
    createdAt: "2026-09-04T08:00:00Z",
    updatedAt: "2026-09-04T08:00:00Z",
  },
  {
    id: 6,
    name: "WEMOVE 儿童自行车 16寸",
    slug: "wemove-bike-16",
    shortDescription: "安全防护，辅助轮可拆",
    description: "符合儿童人体工学，训练轮辅助...",
    price: 599.0,
    dealerPrice: 459.0,
    status: "ACTIVE",
    category: { id: 1, name: "户外玩具" },
    createdAt: "2026-08-25T15:00:00Z",
    updatedAt: "2026-09-01T12:00:00Z",
  },
  {
    id: 7,
    name: "WEMOVE 遥控越野车",
    slug: "wemove-rc-offroad",
    shortDescription: "四驱越野，2.4G 遥控",
    description: "全地形轮胎，攀爬能力强...",
    price: 499.0,
    dealerPrice: 379.0,
    status: "ACTIVE",
    category: { id: 3, name: "遥控玩具" },
    createdAt: "2026-09-03T14:00:00Z",
    updatedAt: "2026-09-03T14:00:00Z",
  },
];

// 工具函数：格式化价格
export function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return `¥${price.toFixed(2)}`;
}

// 状态 → Badge 映射
export const productStatusMap: Record<string, { status: string; label: string }> = {
  ACTIVE: { status: "active", label: "上架中" },
  INACTIVE: { status: "inactive", label: "已下架" },
  DRAFT: { status: "pending", label: "草稿" },
};
