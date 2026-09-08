import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminOrderDetailPage from "./page";
import { ApiError } from "@/lib/api/client";
import type { AdminOrderDetail, OrderItem } from "@/lib/api/types";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const mockReplace = vi.fn();
const mockRouter = { push: vi.fn(), replace: mockReplace };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ id: "42" }),
}));

const mockGetAdminOrder = vi.fn();
const mockUpdateStatus = vi.fn();
vi.mock("@/lib/api/orders", () => ({
  getAdminOrder: (...args: unknown[]) => mockGetAdminOrder(...args),
  updateAdminOrderStatus: (...args: unknown[]) => mockUpdateStatus(...args),
}));

function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 1,
    variantId: 100,
    sku: "WMS-PRO-RED",
    productName: "智慧搬运机器人",
    variantName: "红色标准版",
    quantity: 2,
    unitPrice: 150,
    subtotal: 300,
    ...overrides,
  };
}

function makeOrder(
  overrides: Partial<AdminOrderDetail> = {},
): AdminOrderDetail {
  return {
    id: 42,
    orderNumber: "WM202609000042",
    status: "PENDING",
    totalAmount: 300,
    shippingName: "林同学",
    shippingPhone: "13800000000",
    shippingAddress: "北京市海淀区学院路 1 号",
    remark: "请工作日送达",
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-01T08:00:00Z",
    items: [makeItem()],
    customer: {
      id: 7,
      email: "lin@example.com",
      name: "林同学",
      role: "USER",
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Admin 订单详情页", () => {
  it("渲染订单快照、客户与收货信息，PENDING 显示流转按钮", async () => {
    mockGetAdminOrder.mockResolvedValue(makeOrder());

    render(<AdminOrderDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("WM202609000042")).toBeInTheDocument(),
    );
    expect(screen.getByText("待处理")).toBeInTheDocument();
    expect(screen.getByText("智慧搬运机器人")).toBeInTheDocument();
    expect(screen.getByText("红色标准版 · WMS-PRO-RED")).toBeInTheDocument();
    expect(
      screen.getByText("林同学（lin@example.com）"),
    ).toBeInTheDocument();
    expect(screen.getByText("普通用户")).toBeInTheDocument();
    expect(screen.getByText("北京市海淀区学院路 1 号")).toBeInTheDocument();
    expect(screen.getByText("请工作日送达")).toBeInTheDocument();
    expect(screen.getAllByText("¥300.00").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "确认收款" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "取消订单" })).toBeEnabled();
  });

  it("点击确认收款调用状态流转，成功后更新为已支付并出现发货动作", async () => {
    mockGetAdminOrder.mockResolvedValue(makeOrder());
    mockUpdateStatus.mockResolvedValue(makeOrder({ status: "PAID" }));

    render(<AdminOrderDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("WM202609000042")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "确认收款" }));

    await waitFor(() =>
      expect(mockUpdateStatus).toHaveBeenCalledWith(42, "PAID"),
    );
    expect(
      await screen.findByText("订单状态已更新为「已支付」"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发货" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "确认收款" }),
    ).not.toBeInTheDocument();
  });

  it("流转提交中按钮禁用，防止重复提交", async () => {
    let resolveUpdate: ((v: AdminOrderDetail) => void) | null = null;
    mockGetAdminOrder.mockResolvedValue(makeOrder());
    mockUpdateStatus.mockReturnValue(
      new Promise<AdminOrderDetail>((resolve) => {
        resolveUpdate = resolve;
      }),
    );

    render(<AdminOrderDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("WM202609000042")).toBeInTheDocument(),
    );

    const payButton = screen.getByRole("button", { name: "确认收款" });
    fireEvent.click(payButton);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "处理中..." })).toBeDisabled(),
    );
    expect(
      screen.getByRole("button", { name: "处理中..." }),
    ).toBeInTheDocument();

    resolveUpdate!(makeOrder({ status: "PAID" }));
    await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalled());
  });

  it("已完成订单不显示任何流转按钮", async () => {
    mockGetAdminOrder.mockResolvedValue(makeOrder({ status: "COMPLETED" }));

    render(<AdminOrderDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("WM202609000042")).toBeInTheDocument(),
    );

    expect(
      screen.queryByRole("button", { name: "确认收款" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "发货" })).not.toBeInTheDocument();
    expect(screen.getByText("已完成")).toBeInTheDocument();
  });

  it("流转接口失败时显示错误且保留原状态", async () => {
    mockGetAdminOrder.mockResolvedValue(makeOrder());
    mockUpdateStatus.mockRejectedValue(new Error("当前状态不允许该操作"));

    render(<AdminOrderDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("WM202609000042")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "确认收款" }));

    expect(
      await screen.findByText("当前状态不允许该操作"),
    ).toBeInTheDocument();
    // 仍停留在待处理，可重试
    expect(screen.getByRole("button", { name: "确认收款" })).toBeEnabled();
  });

  it("订单不存在（404）时显示空态", async () => {
    mockGetAdminOrder.mockRejectedValue(new ApiError("Order not found", 404));

    render(<AdminOrderDetailPage />);

    expect(await screen.findByText("订单不存在")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "返回订单列表" }),
    ).toBeInTheDocument();
  });
});
