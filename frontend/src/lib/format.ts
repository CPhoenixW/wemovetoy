// 展示层共享格式化工具与状态映射

export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === "") return "—";
  const num = Number(price);
  if (Number.isNaN(num)) return "—";
  return `¥${num.toFixed(2)}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export const productStatusMap: Record<string, { status: string; label: string }> = {
  ACTIVE: { status: "active", label: "上架中" },
  INACTIVE: { status: "inactive", label: "已下架" },
  DRAFT: { status: "pending", label: "草稿" },
};

export const orderStatusMap: Record<string, { status: string; label: string }> = {
  PENDING: { status: "pending", label: "待处理" },
  PAID: { status: "active", label: "已支付" },
  SHIPPED: { status: "pending", label: "已发货" },
  DELIVERED: { status: "approved", label: "已送达" },
  COMPLETED: { status: "approved", label: "已完成" },
  CANCELLED: { status: "rejected", label: "已取消" },
};

export const dealerStatusMap: Record<string, { status: string; label: string }> = {
  PENDING: { status: "pending", label: "待审核" },
  APPROVED: { status: "approved", label: "已通过" },
  REJECTED: { status: "rejected", label: "已拒绝" },
};
