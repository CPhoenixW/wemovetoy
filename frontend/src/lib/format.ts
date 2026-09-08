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

export function formatAgeRange(
  ageMin: number | null | undefined,
  ageMax: number | null | undefined,
): string | null {
  if (ageMin == null && ageMax == null) return null;
  if (ageMax == null) return `${ageMin}岁+`;
  if (ageMin == null) return `≤${ageMax}岁`;
  return `${ageMin}–${ageMax}岁`;
}

/** 游玩环境：显示层映射常见英文 → 中文；命中失败原样透传（兼容已存中文）。 */
const PLAY_ENVIRONMENT_LABELS: Record<string, string> = {
  indoor: "室内",
  outdoor: "户外",
  "indoor/outdoor": "室内/户外",
  "indoor & outdoor": "室内/户外",
  classroom: "教室",
  home: "居家",
};

export function formatPlayEnvironment(value?: string | null): string | null {
  if (!value) return null;
  return PLAY_ENVIRONMENT_LABELS[value.trim().toLowerCase()] ?? value;
}

/** 规格参数键：显示层映射常见英文键 → 中文；命中失败原样透传（兼容后台上已存中文键）。 */
const SPEC_KEY_LABELS: Record<string, string> = {
  material: "材质",
  ageRange: "适用年龄",
  blockCount: "积木数量",
  // 兼容大写 / 含空格写法
  Material: "材质",
  "Age Range": "适用年龄",
  "age range": "适用年龄",
  BlockCount: "积木数量",
};

export function formatSpecKey(key: string): string {
  const trimmed = key.trim();
  return (
    SPEC_KEY_LABELS[trimmed] ??
    SPEC_KEY_LABELS[trimmed.toLowerCase()] ??
    trimmed
  );
}

export const productStatusMap: Record<string, { status: string; label: string }> = {
  ACTIVE: { status: "active", label: "上架中" },
  ARCHIVED: { status: "inactive", label: "已下架" },
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
