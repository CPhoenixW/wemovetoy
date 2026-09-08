import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExists } = vi.hoisted(() => ({ mockExists: vi.fn() }));

vi.mock("node:fs", () => ({
  default: { existsSync: (...args: unknown[]) => mockExists(...args) },
  existsSync: (...args: unknown[]) => mockExists(...args),
}));

import { productImageSrc } from "./product-image";

beforeEach(() => {
  mockExists.mockReset();
});

describe("productImageSrc 商品图解析", () => {
  it("存在 <slug>.jpg 时返回 /pic/<slug>.jpg（扩展名按 jpg 优先）", () => {
    mockExists.mockReturnValue(true);
    expect(productImageSrc("robot-arm")).toBe("/pic/robot-arm.jpg");
  });

  it("仅存在 .png 时返回 png 路径", () => {
    mockExists.mockImplementation((p: string) => p.endsWith(".png"));
    expect(productImageSrc("robot-arm")).toBe("/pic/robot-arm.png");
  });

  it("支持 .jpeg / .webp", () => {
    mockExists.mockImplementation((p: string) => p.endsWith(".webp"));
    expect(productImageSrc("robot-arm")).toBe("/pic/robot-arm.webp");
  });

  it("无对应图片时返回 null", () => {
    mockExists.mockReturnValue(false);
    expect(productImageSrc("robot-arm")).toBeNull();
  });
});
