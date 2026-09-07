import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import CartPage from "./page";
import { ApiError } from "@/lib/api/client";
import type { Cart } from "@/lib/api/types";

// mock next/link，避免 jsdom 下 router 报错
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
        sku: "robot-basic",
        productName: "Robot Arm",
        variantName: "Basic",
        quantity: 1,
        unitPrice: 150,
        subtotal: 150,
        availableStock: 5,
        isPurchasable: true,
      },
      {
        id: 11,
        variantId: 101,
        sku: "snake-pro",
        productName: "Snake Set",
        variantName: "Pro",
        quantity: 1,
        unitPrice: 50,
        subtotal: 50,
        availableStock: 10,
        isPurchasable: true,
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  // mockReset：清除调用记录与 once 实现，保证用例间完全隔离
  [mockGetCart, mockUpdateCartItem, mockRemoveCartItem, mockCreateOrder].forEach(
    (m) => m.mockReset(),
  );
  mockPush.mockReset();
  mockReplace.mockReset();
});

describe("普通用户购物车页", () => {
  it("渲染商品行与数量", async () => {
    mockGetCart.mockResolvedValue(makeCart());

    render(<CartPage />);

    await waitFor(() =>
      expect(screen.getByText("Robot Arm")).toBeInTheDocument(),
    );
    expect(screen.getByText("Snake Set")).toBeInTheDocument();
    expect(screen.getByText("Basic（robot-basic）")).toBeInTheDocument();
    expect(screen.getAllByText("¥150.00").length).toBeGreaterThan(0);
  });

  it("空购物车显示空态并可去选购", async () => {
    mockGetCart.mockResolvedValue(makeCart({ items: [], itemCount: 0, totalAmount: 0 }));

    render(<CartPage />);

    await waitFor(() =>
      expect(screen.getByText("Your cart is empty")).toBeInTheDocument(),
    );
    expect(screen.getByText("Browse products")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Checkout" })).toBeNull();
  });

  it("数量等于可用库存时加号禁用", async () => {
    mockGetCart.mockResolvedValue(
      makeCart({
        items: [
          {
            id: 10,
            variantId: 100,
            sku: "robot-basic",
            productName: "Robot Arm",
            variantName: "Basic",
            quantity: 5,
            unitPrice: 150,
            subtotal: 750,
            availableStock: 5,
            isPurchasable: true,
          },
        ],
      }),
    );

    render(<CartPage />);
    await waitFor(() =>
      expect(screen.getByText("Robot Arm")).toBeInTheDocument(),
    );

    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
  });

  it("数量超过可用库存时结算禁用并提示", async () => {
    mockGetCart.mockResolvedValue(
      makeCart({
        items: [
          {
            id: 10,
            variantId: 100,
            sku: "robot-basic",
            productName: "Robot Arm",
            variantName: "Basic",
            quantity: 8,
            unitPrice: 150,
            subtotal: 1200,
            availableStock: 5,
            isPurchasable: true,
          },
        ],
      }),
    );

    render(<CartPage />);
    await waitFor(() =>
      expect(screen.getByText("Robot Arm")).toBeInTheDocument(),
    );

    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
    expect(
      screen.getByText(/exceed available stock/i),
    ).toBeInTheDocument();
  });

  it("存在不可售 SKU 时结算禁用并提示移除", async () => {
    mockGetCart.mockResolvedValue(
      makeCart({
        items: [
          {
            id: 10,
            variantId: 100,
            sku: "robot-basic",
            productName: "Robot Arm",
            variantName: "Basic",
            quantity: 1,
            unitPrice: 150,
            subtotal: 150,
            availableStock: 0,
            isPurchasable: false,
          },
        ],
      }),
    );

    render(<CartPage />);
    await waitFor(() =>
      expect(screen.getByText("Robot Arm")).toBeInTheDocument(),
    );

    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
    expect(
      screen.getByText(/no longer purchasable/i),
    ).toBeInTheDocument();
  });

  it("点移除调用 removeCartItem 并重载", async () => {
    // 用可变快照模拟：移除成功后购物车变空，重载返回空车
    const state = { value: makeCart() };
    mockGetCart.mockImplementation(() => Promise.resolve(state.value));
    mockRemoveCartItem.mockImplementation(async () => {
      state.value = makeCart({ items: [], itemCount: 0, totalAmount: 0 });
    });

    render(<CartPage />);
    await waitFor(() =>
      expect(screen.getByText("Robot Arm")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);

    await waitFor(() =>
      expect(mockRemoveCartItem).toHaveBeenCalledWith(10),
    );
    await waitFor(() =>
      expect(screen.getByText("Your cart is empty")).toBeInTheDocument(),
    );
  });

  it("增减数量调用 updateCartItem", async () => {
    mockGetCart.mockResolvedValue(makeCart());
    mockUpdateCartItem.mockResolvedValue({});

    render(<CartPage />);
    await waitFor(() =>
      expect(screen.getByText("Robot Arm")).toBeInTheDocument(),
    );

    const rows = screen.getAllByText("Robot Arm").length;
    expect(rows).toBeGreaterThan(0);
    // 第一行的加号
    const increase = screen.getAllByRole("button", { name: "Increase" })[0];
    fireEvent.click(increase);
    await waitFor(() =>
      expect(mockUpdateCartItem).toHaveBeenCalledWith(10, 2),
    );
  });

  it("成功下单后显示订单号", async () => {
    mockGetCart.mockResolvedValue(makeCart());
    mockCreateOrder.mockResolvedValue({
      id: 1,
      orderNumber: "WM202609010001",
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

    render(<CartPage />);
    await waitFor(() =>
      expect(screen.getByText("Robot Arm")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    const confirmBtn = await screen.findByRole("button", { name: "Place order" });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(screen.getByText(/Order number:/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("WM202609010001")).toBeInTheDocument();
  });

  it("购物车读取返回 401 时跳登录带回跳参数", async () => {
    mockGetCart.mockRejectedValue(new ApiError("Unauthorized", 401));

    render(<CartPage />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fcart"),
    );
  });

  it("下单库存不足(400)时关闭弹窗并展示服务端错误", async () => {
    // 持久 mock：挂载与 400 后重载都返回满车，错误文案经 error&&cart 分支必然渲染
    mockGetCart.mockResolvedValue(makeCart());
    mockCreateOrder.mockRejectedValue(
      new ApiError("Insufficient stock for variant robot-basic", 400),
    );

    render(<CartPage />);
    await waitFor(() =>
      expect(screen.getByText("Robot Arm")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    const confirmBtn = await screen.findByRole("button", { name: "Place order" });
    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(
        screen.getByText("Insufficient stock for variant robot-basic"),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: "Place order" })).toBeNull();
  });
});
