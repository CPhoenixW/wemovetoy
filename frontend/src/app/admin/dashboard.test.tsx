import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminDashboardPage from "./page";

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
// 注意：useRouter 必须返回稳定引用，否则 useCallback/useEffect 会反复触发
const mockRouter = { push: vi.fn(), replace: mockReplace };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

const mockListProducts = vi.fn();
const mockListOrders = vi.fn();
const mockListApplications = vi.fn();
vi.mock("@/lib/api/products", () => ({
  listAdminProducts: (...args: unknown[]) => mockListProducts(...args),
}));
vi.mock("@/lib/api/orders", () => ({
  listAdminOrders: (...args: unknown[]) => mockListOrders(...args),
}));
vi.mock("@/lib/api/dealers", () => ({
  listAdminApplications: (...args: unknown[]) => mockListApplications(...args),
}));

function paginated(total: number) {
  return { items: [], total, page: 1, pageSize: 1, totalPages: 1 };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Admin Dashboard 页", () => {
  it("加载完成后渲染三张统计卡与快捷入口", async () => {
    // 商品接口被调用两次（全部 / 草稿），按参数区分返回
    mockListProducts.mockImplementation((query?: { status?: string }) =>
      Promise.resolve(paginated(query?.status === "DRAFT" ? 3 : 12)),
    );
    mockListOrders.mockResolvedValue(paginated(5));
    mockListApplications.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    render(<AdminDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("商品总数")).toBeInTheDocument(),
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("草稿 3 个")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("待处理订单")).toBeInTheDocument();
    expect(screen.getByText("待审核经销商申请")).toBeInTheDocument();

    // 快捷入口
    expect(screen.getByRole("link", { name: /商品管理/ })).toHaveAttribute(
      "href",
      "/admin/products",
    );
    expect(screen.getByRole("link", { name: /订单管理/ })).toHaveAttribute(
      "href",
      "/admin/orders",
    );
    expect(
      screen.getByRole("link", { name: /经销商审核/ }),
    ).toHaveAttribute("href", "/admin/dealers");
  });

  it("统计接口失败时显示错误并可重试", async () => {
    mockListProducts.mockRejectedValue(new Error("网络错误"));
    mockListOrders.mockResolvedValue(paginated(0));
    mockListApplications.mockResolvedValue([]);

    render(<AdminDashboardPage />);

    expect(await screen.findByText("统计数据加载失败")).toBeInTheDocument();
    expect(screen.getByText("网络错误")).toBeInTheDocument();

    // 重试后恢复
    mockListProducts.mockImplementation((query?: { status?: string }) =>
      Promise.resolve(paginated(query?.status === "DRAFT" ? 0 : 0)),
    );

    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() =>
      expect(screen.getByText("商品总数")).toBeInTheDocument(),
    );
    expect(screen.queryByText("统计数据加载失败")).not.toBeInTheDocument();
  });

  it("401 时跳转登录页并带上回跳地址", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mockListProducts.mockRejectedValue(new ApiError("Unauthorized", 401));
    mockListOrders.mockResolvedValue(paginated(0));
    mockListApplications.mockResolvedValue([]);

    render(<AdminDashboardPage />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fadmin"),
    );
  });
});
