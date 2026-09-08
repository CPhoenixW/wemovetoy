import { describe, it, expect } from "vitest";
import { formatPrice, formatDate, formatSpecKey, productStatusMap, orderStatusMap, dealerStatusMap } from "@/lib/format";

describe("formatPrice", () => {
  it("正数格式化为带两位小数的人民币", () => {
    expect(formatPrice(99.5)).toBe("¥99.50");
  });

  it("整数补两位小数", () => {
    expect(formatPrice(100)).toBe("¥100.00");
  });

  it("null/undefined/空字符串返回 —", () => {
    expect(formatPrice(null)).toBe("—");
    expect(formatPrice(undefined)).toBe("—");
    expect(formatPrice("")).toBe("—");
  });
});

describe("formatDate", () => {
  it("null 返回 —", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("ISO 字符串格式化为 月/日 时:分", () => {
    // 固定一个 UTC 时间，避免时区波动
    const iso = new Date("2026-01-15T08:30:00Z").toISOString();
    const result = formatDate(iso);
    expect(result).toMatch(/\d{1,2}\/\d{1,2} \d{2}:\d{2}/);
  });
});

describe("formatSpecKey", () => {
  it("英文规格键映射为中文", () => {
    expect(formatSpecKey("material")).toBe("材质");
    expect(formatSpecKey("ageRange")).toBe("适用年龄");
    expect(formatSpecKey("blockCount")).toBe("积木数量");
  });

  it("兼容带空格/大写写法", () => {
    expect(formatSpecKey("Age Range")).toBe("适用年龄");
    expect(formatSpecKey("Material")).toBe("材质");
  });

  it("未命中的键（含已存中文键）原样透传", () => {
    expect(formatSpecKey("材质")).toBe("材质");
    expect(formatSpecKey("giftBox")).toBe("giftBox");
  });
});

describe("productStatusMap", () => {
  it("包含 ACTIVE / ARCHIVED / DRAFT 三种后端枚举状态", () => {
    expect(Object.keys(productStatusMap).sort()).toEqual(
      ["ACTIVE", "ARCHIVED", "DRAFT"].sort(),
    );
  });

  it("不再包含后端不存在的 INACTIVE 状态", () => {
    expect(productStatusMap).not.toHaveProperty("INACTIVE");
  });

  it("ARCHIVED 映射为已下架", () => {
    expect(productStatusMap["ARCHIVED"]?.label).toBe("已下架");
  });
});

describe("orderStatusMap", () => {
  it("覆盖全部 6 种订单状态", () => {
    expect(Object.keys(orderStatusMap).sort()).toEqual(
      ["PENDING", "PAID", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"].sort(),
    );
  });
});

describe("dealerStatusMap", () => {
  it("覆盖 3 种经销商申请状态", () => {
    expect(Object.keys(dealerStatusMap).sort()).toEqual(
      ["PENDING", "APPROVED", "REJECTED"].sort(),
    );
  });
});
