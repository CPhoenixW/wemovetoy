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

function paginated<T>(items: T[], total: number) {
  return {
    items,
    total,
    page: 1,
    pageSize: items.length || 1,
    totalPages: 1,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Admin Dashboard 页", () => {
  it("加载完成后渲染统计卡、待处理事项与快捷入口", async () => {
    // 商品接口被调用两次（全部 / 草稿，草稿返回 2 条 items）
    mockListProducts.mockImplementation((query?: { status?: string; limit?: number }) =>
      Promise.resolve(
        query?.status === "DRAFT"
          ? paginated(
              [
                {
                  id: 101,
                  name: "草稿滑板",
                  slug: "draft-board",
                  shortDescription: "",
                  description: "",
                  price: 99,
                  dealerPrice: null,
                  ageMin: null,
                  ageMax: null,
                  playEnvironment: null,
                  status: "DRAFT",
                  features: [],
                  specifications: {},
                  categoryId: 1,
                  createdAt: "2026-09-08T10:00:00Z",
                  updatedAt: "2026-09-08T10:00:00Z",
                  category: { id: 1, name: "滑板", slug: "skateboard" },
                },
              ],
              3,
            )
          : paginated([], 12),
      ),
    );
    // 待处理订单返回 1 条
    mockListOrders.mockResolvedValue(
      paginated(
        [
          {
            id: 7,
            orderNumber: "ORD-007",
            status: "PENDING",
            totalAmount: 199,
            itemCount: 2,
            customer: { id: 5, email: "u@e.com", name: "张三", role: "USER" },
            dealerCompany: null,
            createdAt: "2026-09-08T09:00:00Z",
          },
        ],
        5,
      ),
    );
    mockListApplications.mockResolvedValue([
      {
        id: 11,
        userId: 9,
        companyName: "新申请公司",
        contactName: "李四",
        contactPhone: "13800000000",
        address: null,
        taxId: null,
        status: "PENDING",
        reviewNote: null,
        reviewedById: null,
        reviewedAt: null,
        createdAt: "2026-09-08T08:00:00Z",
        updatedAt: "2026-09-08T08:00:00Z",
        companyId: null,
      },
    ]);

    render(<AdminDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("商品总数")).toBeInTheDocument(),
    );

    // 统计卡（订单/申请数字会同时出现在计数 badge 中，用 getAllByText 兼容）
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("草稿 3 个")).toBeInTheDocument();
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);

    // 待处理事项标题（部分文案会同时出现在 stat 卡和 todo 区块，用 getAllByText 兼容）
    expect(screen.getByText("待处理事项")).toBeInTheDocument();
    expect(screen.getByText("待确认收款订单")).toBeInTheDocument();
    expect(screen.getAllByText("待审核经销商申请").length).toBeGreaterThan(0);
    expect(screen.getByText("草稿商品")).toBeInTheDocument();

    // 待处理订单列表项
    expect(screen.getByText("ORD-007")).toBeInTheDocument();
    expect(screen.getByText("张三")).toBeInTheDocument();

    // 草稿商品列表项
    expect(screen.getByText("草稿滑板")).toBeInTheDocument();

    // 经销商申请列表项
    expect(screen.getByText("新申请公司")).toBeInTheDocument();

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
      screen.getByRole("link", { name: /Dealer 审核/ }),
    ).toHaveAttribute("href", "/admin/dealers");
  });

  it("待处理列表为空时显示空状态文案", async () => {
    mockListProducts.mockImplementation((query?: { status?: string }) =>
      Promise.resolve(
        query?.status === "DRAFT" ? paginated([], 0) : paginated([], 0),
      ),
    );
    mockListOrders.mockResolvedValue(paginated([], 0));
    mockListApplications.mockResolvedValue([]);

    render(<AdminDashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("暂无待收款订单")).toBeInTheDocument(),
    );
    expect(screen.getByText("暂无待审核申请")).toBeInTheDocument();
    expect(screen.getByText("暂无草稿商品")).toBeInTheDocument();
  });

  it("统计接口失败时显示错误并可重试", async () => {
    mockListProducts.mockRejectedValue(new Error("网络错误"));
    mockListOrders.mockResolvedValue(paginated([], 0));
    mockListApplications.mockResolvedValue([]);

    render(<AdminDashboardPage />);

    expect(await screen.findByText("统计数据加载失败")).toBeInTheDocument();
    expect(screen.getByText("网络错误")).toBeInTheDocument();

    // 重试后恢复
    mockListProducts.mockImplementation((query?: { status?: string }) =>
      Promise.resolve(
        query?.status === "DRAFT" ? paginated([], 0) : paginated([], 0),
      ),
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
    mockListOrders.mockResolvedValue(paginated([], 0));
    mockListApplications.mockResolvedValue([]);

    render(<AdminDashboardPage />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fadmin"),
    );
  });
});
