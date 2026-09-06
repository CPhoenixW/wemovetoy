import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminProductsPage from "@/app/admin/products/page";
import type { AdminProduct, Paginated } from "@/lib/api/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockListAdminProducts = vi.fn();
const mockDeleteProduct = vi.fn();
const mockPublishProduct = vi.fn();

vi.mock("@/lib/api/products", () => ({
  listAdminProducts: (...args: unknown[]) => mockListAdminProducts(...args),
  deleteProduct: (...args: unknown[]) => mockDeleteProduct(...args),
  publishProduct: (...args: unknown[]) => mockPublishProduct(...args),
}));

function makeProducts(count: number, offset = 0): AdminProduct[] {
  return Array.from({ length: count }, (_, i) => ({
    id: offset + i + 1,
    name: `商品${offset + i + 1}`,
    slug: `p-${offset + i + 1}`,
    shortDescription: "简介",
    description: "描述",
    price: 99,
    dealerPrice: 60,
    ageMin: null,
    ageMax: null,
    playEnvironment: null,
    status: "ACTIVE",
    features: [],
    specifications: {},
    categoryId: null,
    category: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }));
}

function paginated(items: AdminProduct[], total: number, page: number, pageSize = 20): Paginated<AdminProduct> {
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

describe("Admin 商品列表：分页", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("数据超过一页时渲染分页控件", async () => {
    mockListAdminProducts.mockResolvedValue(paginated(makeProducts(20), 45, 1));

    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("商品1")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "上一页" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下一页" })).toBeInTheDocument();
    expect(screen.getByText("第 1 / 3 页，共 45 条")).toBeInTheDocument();
  });

  it("第一页时上一页按钮禁用", async () => {
    mockListAdminProducts.mockResolvedValue(paginated(makeProducts(20), 45, 1));

    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("商品1")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "下一页" })).not.toBeDisabled();
  });

  it("翻到最后一页时下一页按钮禁用", async () => {
    mockListAdminProducts.mockImplementation((q: { page?: number }) => {
      const p = q.page ?? 1;
      return Promise.resolve(paginated(makeProducts(p === 3 ? 5 : 20, (p - 1) * 20), 45, p));
    });

    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("商品1")).toBeInTheDocument());

    // 第 1 页 → 下一页可用
    expect(screen.getByRole("button", { name: "下一页" })).not.toBeDisabled();

    // 翻到第 2 页
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    await waitFor(() => expect(screen.getByText("商品21")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "下一页" })).not.toBeDisabled();

    // 翻到第 3 页（最后一页）
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    await waitFor(() => expect(screen.getByText("商品41")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "下一页" })).toBeDisabled();
    expect(screen.getByText("第 3 / 3 页，共 45 条")).toBeInTheDocument();
  });

  it("点击下一页后用 page=2 重新请求", async () => {
    mockListAdminProducts
      .mockResolvedValueOnce(paginated(makeProducts(20), 45, 1))
      .mockResolvedValueOnce(paginated(makeProducts(20, 20), 45, 2));

    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("商品1")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "下一页" }));

    await waitFor(() => {
      const calls = mockListAdminProducts.mock.calls;
      const lastCall = calls[calls.length - 1][0] as { page?: number };
      expect(lastCall.page).toBe(2);
    });
  });

  it("数据不足一页时不渲染分页控件", async () => {
    mockListAdminProducts.mockResolvedValue(paginated(makeProducts(5), 5, 1));

    render(<AdminProductsPage />);
    await waitFor(() => expect(screen.getByText("商品1")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: "上一页" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "下一页" })).not.toBeInTheDocument();
  });
});
