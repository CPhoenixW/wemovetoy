import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import OrderDetailPage from "./page";
import { ApiError } from "@/lib/api/client";
import type { Order, OrderItem } from "@/lib/api/types";

// mock next/link，避免 jsdom 下 router 报错
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
// 稳定引用：避免每次 render 重建 router 使依赖 [router] 的 load 无限重载
const mockRouter = { push: mockPush, replace: mockReplace };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ id: "42" }),
}));

const mockGetMyOrder = vi.fn();
const mockCancelMyOrder = vi.fn();
vi.mock("@/lib/api/orders", () => ({
  getMyOrder: (...args: unknown[]) => mockGetMyOrder(...args),
  cancelMyOrder: (...args: unknown[]) => mockCancelMyOrder(...args),
}));

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 1,
    variantId: 100,
    sku: "robot-basic",
    productName: "Robot Arm",
    variantName: "Basic",
    quantity: 2,
    unitPrice: 150,
    subtotal: 300,
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    orderNumber: "WM202609000042",
    status: "PENDING",
    totalAmount: 300,
    shippingName: "Lin",
    shippingPhone: "13800000000",
    shippingAddress: null,
    remark: null,
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-01T08:00:00Z",
    items: [makeItem()],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("订单详情页", () => {
  it("渲染快照明细、收货信息与 PENDING 的取消按钮", async () => {
    mockGetMyOrder.mockResolvedValue(makeOrder());

    render(<OrderDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("WM202609000042")).toBeInTheDocument(),
    );
    expect(screen.getByText("待处理")).toBeInTheDocument();
    expect(screen.getByText("Robot Arm")).toBeInTheDocument();
    expect(screen.getByText("Basic · robot-basic")).toBeInTheDocument();
    expect(screen.getByText("Lin")).toBeInTheDocument();
    // 小计 300 与订单合计 300 会同时出现
    expect(screen.getAllByText("¥300.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "取消订单" })).toBeEnabled();
    // 概要卡突出 状态 / 下一步 / 总金额；配送备注收进次级区
    expect(screen.getByText("总金额")).toBeInTheDocument();
    expect(screen.getByText("商家将尽快确认并处理您的订单。")).toBeInTheDocument();
    expect(screen.getByText("配送与备注")).toBeInTheDocument();
  });

  it("取消需确认，成功后调用 cancelMyOrder(42) 且状态变 CANCELLED", async () => {
    // 快照式：取消后重载返回 CANCELLED
    const state = { order: makeOrder({ status: "PENDING" }) };
    mockGetMyOrder.mockImplementation(() => Promise.resolve(state.order));
    mockCancelMyOrder.mockImplementation(async () => {
      state.order = makeOrder({ status: "CANCELLED" });
      return state.order;
    });

    render(<OrderDetailPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "取消订单" })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "取消订单" }));
    fireEvent.click(screen.getByRole("button", { name: "确认取消" }));

    await waitFor(() =>
      expect(mockCancelMyOrder).toHaveBeenCalledWith(42),
    );
    await waitFor(() =>
      expect(screen.getByText("已取消")).toBeInTheDocument(),
    );
    expect(screen.getByText("订单已取消。")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "取消订单" }),
    ).toBeNull();
  });

  it("非 PENDING 单不显示取消按钮", async () => {
    mockGetMyOrder.mockResolvedValue(makeOrder({ status: "PAID" }));

    render(<OrderDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("WM202609000042")).toBeInTheDocument(),
    );
    expect(screen.getByText("已支付")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "取消订单" }),
    ).toBeNull();
  });

  it("404 显示未找到并回列表", async () => {
    mockGetMyOrder.mockRejectedValue(new ApiError("Order not found", 404));

    render(<OrderDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("未找到该订单")).toBeInTheDocument(),
    );
    expect(screen.getByText("返回我的订单")).toBeInTheDocument();
  });

  it("读取 401 跳登录带回跳参数", async () => {
    mockGetMyOrder.mockRejectedValue(new ApiError("Unauthorized", 401));

    render(<OrderDetailPage />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Forders%2F42"),
    );
  });
});
