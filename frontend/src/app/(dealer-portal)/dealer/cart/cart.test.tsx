import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import DealerCartPage from "@/app/(dealer-portal)/dealer/cart/page";
import type { Cart } from "@/lib/api/types";

// mock next/link，避免 jsdom 下 router 报错
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetCart = vi.fn();
const mockUpdateCartItem = vi.fn();
const mockRemoveCartItem = vi.fn();
const mockCreateOrder = vi.fn();

vi.mock("@/lib/api/cart", () => ({
  getCart: (...args: unknown[]) => mockGetCart(...args),
  updateCartItem: (...args: unknown[]) => mockUpdateCartItem(...args),
  removeCartItem: (...args: unknown[]) => mockRemoveCartItem(...args),
}));

vi.mock("@/lib/api/orders", () => ({
  createOrder: (...args: unknown[]) => mockCreateOrder(...args),
}));

function makeCart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 1,
    itemCount: 2,
    totalAmount: 200,
    updatedAt: "2026-01-01T00:00:00Z",
    items: [
      {
        id: 10,
        variantId: 100,
        sku: "SKU-A",
        productName: "商品A",
        variantName: "红色",
        quantity: 3,
        unitPrice: 50,
        subtotal: 150,
        availableStock: 5,
        isPurchasable: true,
      },
      {
        id: 11,
        variantId: 101,
        sku: "SKU-B",
        productName: "商品B",
        variantName: "蓝色",
        quantity: 2,
        unitPrice: 25,
        subtotal: 50,
        availableStock: 10,
        isPurchasable: true,
      },
    ],
    ...overrides,
  };
}

describe("购物车页：库存与提交锁", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("数量等于可用库存时，加号按钮禁用", async () => {
    mockGetCart.mockResolvedValue(
      makeCart({
        items: [
          {
            id: 10,
            variantId: 100,
            sku: "SKU-A",
            productName: "商品A",
            variantName: "红色",
            quantity: 5,
            unitPrice: 50,
            subtotal: 250,
            availableStock: 5,
            isPurchasable: true,
          },
        ],
      }),
    );

    render(<DealerCartPage />);
    await waitFor(() => expect(screen.getByText("商品A")).toBeInTheDocument());

    // 找到该商品行的加号按钮
    const addBtns = screen.getAllByRole("button", { name: "增加" });
    expect(addBtns[0]).toBeDisabled();
  });

  it("数量超过可用库存时，结算按钮禁用", async () => {
    mockGetCart.mockResolvedValue(
      makeCart({
        items: [
          {
            id: 10,
            variantId: 100,
            sku: "SKU-A",
            productName: "商品A",
            variantName: "红色",
            quantity: 8,
            unitPrice: 50,
            subtotal: 400,
            availableStock: 5,
            isPurchasable: true,
          },
        ],
      }),
    );

    render(<DealerCartPage />);
    await waitFor(() => expect(screen.getByText("商品A")).toBeInTheDocument());

    const checkoutBtn = screen.getByRole("button", { name: "提交订单" });
    expect(checkoutBtn).toBeDisabled();
    expect(screen.getByText("存在超出可用库存的商品，请调整数量")).toBeInTheDocument();
  });

  it("存在不可售 SKU 时，结算按钮禁用", async () => {
    mockGetCart.mockResolvedValue(
      makeCart({
        items: [
          {
            id: 10,
            variantId: 100,
            sku: "SKU-A",
            productName: "商品A",
            variantName: "红色",
            quantity: 1,
            unitPrice: 50,
            subtotal: 50,
            availableStock: 0,
            isPurchasable: false,
          },
        ],
      }),
    );

    render(<DealerCartPage />);
    await waitFor(() => expect(screen.getByText("商品A")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "提交订单" })).toBeDisabled();
    expect(screen.getByText("该 SKU 已不可售，请移除")).toBeInTheDocument();
  });

  it("正常购物车可打开结算弹窗，且提交中确认按钮禁用", async () => {
    mockGetCart.mockResolvedValue(makeCart());
    mockCreateOrder.mockResolvedValue({
      id: 1,
      orderNumber: "ORD-2026-001",
      status: "PENDING",
      totalAmount: 200,
      shippingName: null,
      shippingPhone: null,
      shippingAddress: null,
      remark: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      items: [],
    });

    render(<DealerCartPage />);
    await waitFor(() => expect(screen.getByText("商品A")).toBeInTheDocument());

    // 打开结算弹窗
    fireEvent.click(screen.getByRole("button", { name: "提交订单" }));
    const confirmBtn = await screen.findByRole("button", { name: "确认提交订单" });
    expect(confirmBtn).not.toBeDisabled();

    // 点击提交后按钮变为禁用（提交锁）
    fireEvent.click(confirmBtn);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "提交中..." })).toBeDisabled(),
    );
  });
});
