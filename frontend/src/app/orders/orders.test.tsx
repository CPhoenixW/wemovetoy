import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MyOrdersPage from "./page";
import { ApiError } from "@/lib/api/client";
import type { Order, Paginated } from "@/lib/api/types";

// mock next/link，避免 jsdom 下 router 报错
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
// 稳定引用：真实 Next useRouter 每次 render 返回同一对象，
// 若在此返回新对象，依赖 [router] 的 load 会反复重建并无限重载
const mockRouter = { push: mockPush, replace: mockReplace };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

const mockListMyOrders = vi.fn();
vi.mock("@/lib/api/orders", () => ({
  listMyOrders: (...args: unknown[]) => mockListMyOrders(...args),
}));

function makeOrder(id: number, overrides: Partial<Order> = {}): Order {
  return {
    id,
    orderNumber: `WM2026090${String(id).padStart(3, "0")}`,
    status: "PENDING",
    totalAmount: 200,
    shippingName: null,
    shippingPhone: null,
    shippingAddress: null,
    remark: null,
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-01T08:00:00Z",
    items: [],
    ...overrides,
  };
}

function makePage(
  orders: Order[],
  page = 1,
  totalPages = 1,
): Paginated<Order> {
  return {
    items: orders,
    total: orders.length,
    page,
    pageSize: 20,
    totalPages,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("我的订单列表页", () => {
  it("渲染订单行：单号/状态/金额/查看链接", async () => {
    mockListMyOrders.mockResolvedValue(
      makePage([makeOrder(1, { status: "PENDING" }), makeOrder(2, { status: "PAID" })]),
    );

    render(<MyOrdersPage />);

    await waitFor(() =>
      expect(screen.getByText("WM2026090001")).toBeInTheDocument(),
    );
    expect(screen.getByText("WM2026090002")).toBeInTheDocument();
    expect(screen.getAllByText("¥200.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("空列表显示空态并可去选购", async () => {
    mockListMyOrders.mockResolvedValue(makePage([], 1, 0));

    render(<MyOrdersPage />);

    await waitFor(() =>
      expect(screen.getByText("No orders yet")).toBeInTheDocument(),
    );
    expect(screen.getByText("Browse products")).toBeInTheDocument();
  });

  it("读取 401 时跳登录带回跳参数", async () => {
    mockListMyOrders.mockRejectedValue(new ApiError("Unauthorized", 401));

    render(<MyOrdersPage />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Forders"),
    );
  });

  it("接口失败显示重试，点重试再次请求", async () => {
    // 状态机：首次请求失败、之后成功，避免 once 队列被重复 load 偷吃
    let calls = 0;
    mockListMyOrders.mockImplementation(() => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new ApiError("boom", 500))
        : Promise.resolve(makePage([makeOrder(1)]));
    });

    render(<MyOrdersPage />);

    await waitFor(() =>
      expect(screen.getByText("Couldn’t load your orders")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByText("WM2026090001")).toBeInTheDocument(),
    );
  });

  it("多页时上一页/下一页按边界禁用并能翻页", async () => {
    // 快照式实现：按请求 page 返回对应页数据，避免 once 队列时序问题
    mockListMyOrders.mockImplementation((query: { page: number }) =>
      Promise.resolve(
        query.page >= 2
          ? makePage([makeOrder(2)], 2, 2)
          : makePage([makeOrder(1)], 1, 2),
      ),
    );

    render(<MyOrdersPage />);

    await waitFor(() =>
      expect(screen.getByText("WM2026090001")).toBeInTheDocument(),
    );
    const prev = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();

    fireEvent.click(next);

    await waitFor(() =>
      expect(screen.getByText("WM2026090002")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
  });
});
