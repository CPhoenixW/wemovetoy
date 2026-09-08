import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import DealerCompanyPage from "@/app/(dealer-portal)/dealer/company/page";
import { ApiError } from "@/lib/api/client";
import type {
  AuthenticatedUser,
  DealerCompany,
  DealerMember,
} from "@/lib/api/types";

// mock next/link：渲染为 <a>，空态引导链接可被 getByRole("link") 命中
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

// useRouter 返回稳定引用（组件外定义），避免 effect 反复重建冲掉 mock 队列
const mockReplace = vi.fn();
const mockRouter = {
  push: vi.fn(),
  replace: mockReplace,
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
};
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/dealer/company",
  useParams: () => ({}),
}));

const ownerUser: AuthenticatedUser = {
  id: 10,
  email: "owner@dealer.local",
  name: "王老板",
  role: "DEALER",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const memberUser: AuthenticatedUser = {
  ...ownerUser,
  id: 11,
  email: "buyer@dealer.local",
  name: "李采购",
};
const mockUseAuth = vi.fn<
  (requiredRole?: "USER" | "DEALER" | "ADMIN") => AuthenticatedUser | null
>(() => ownerUser);
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: (requiredRole?: "USER" | "DEALER" | "ADMIN") =>
    mockUseAuth(requiredRole),
  useLogout: () => vi.fn(),
}));

const mockGetMyCompanyId = vi.fn();
const mockGetCompany = vi.fn();
const mockListCompanyMembers = vi.fn();
const mockAddCompanyMember = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  getMyCompanyId: (...args: unknown[]) => mockGetMyCompanyId(...args),
  getCompany: (...args: unknown[]) => mockGetCompany(...args),
  listCompanyMembers: (...args: unknown[]) => mockListCompanyMembers(...args),
  addCompanyMember: (...args: unknown[]) => mockAddCompanyMember(...args),
}));

const company: DealerCompany = {
  id: 7,
  name: "测试玩具批发有限公司",
  contactName: "王老板",
  contactPhone: "13800000000",
  address: "广州市越秀区玩具城 1 号",
  taxId: "91440101MA000000X",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const ownerMember: DealerMember = {
  id: 1,
  companyId: 7,
  userId: 10,
  role: "OWNER",
  createdAt: "2026-01-01T00:00:00Z",
  user: { id: 10, email: "owner@dealer.local", name: "王老板" },
};
const buyerMember: DealerMember = {
  id: 2,
  companyId: 7,
  userId: 11,
  role: "MEMBER",
  createdAt: "2026-02-01T00:00:00Z",
  user: { id: 11, email: "buyer@dealer.local", name: "李采购" },
};

describe("Dealer 企业页", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(ownerUser);
    mockGetCompany.mockResolvedValue(company);
  });

  it("未入驻经销商看到空态与入驻引导，且不请求公司接口", async () => {
    mockGetMyCompanyId.mockResolvedValue(null);

    render(<DealerCompanyPage />);
    expect(
      await screen.findByText("你还没有关联企业"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "去提交入驻申请" }),
    ).toHaveAttribute("href", "/dealer/apply");
    expect(mockGetCompany).not.toHaveBeenCalled();
    expect(mockListCompanyMembers).not.toHaveBeenCalled();
  });

  it("渲染企业信息与成员列表，当前用户行标记（我）", async () => {
    mockGetMyCompanyId.mockResolvedValue(7);
    mockListCompanyMembers.mockResolvedValue([ownerMember, buyerMember]);

    render(<DealerCompanyPage />);

    expect(
      await screen.findByText("测试玩具批发有限公司"),
    ).toBeInTheDocument();
    expect(screen.getByText("广州市越秀区玩具城 1 号")).toBeInTheDocument();
    expect(screen.getByText("91440101MA000000X")).toBeInTheDocument();
    expect(screen.getByText("王老板（我）")).toBeInTheDocument();
    expect(screen.getByText("李采购")).toBeInTheDocument();
    expect(screen.getAllByText("负责人").length).toBeGreaterThan(0);
    // 「成员」既出现在表头列名，也出现在 MEMBER 角色徽章
    expect(screen.getAllByText("成员").length).toBeGreaterThanOrEqual(2);
    // OWNER 可见邀请表单
    expect(screen.getByRole("button", { name: "发送邀请" })).toBeInTheDocument();
  });

  it("邀请成功：调用 addCompanyMember、显示成功提示并刷新成员列表", async () => {
    mockGetMyCompanyId.mockResolvedValue(7);
    const newMember: DealerMember = {
      id: 3,
      companyId: 7,
      userId: 12,
      role: "MEMBER",
      createdAt: "2026-03-01T00:00:00Z",
      user: { id: 12, email: "new@dealer.local", name: null },
    };
    mockAddCompanyMember.mockResolvedValue(newMember);
    // 首次加载 [owner, buyer]，邀请后刷新多出新成员
    let callCount = 0;
    mockListCompanyMembers.mockImplementation(async () => {
      callCount += 1;
      return callCount <= 1
        ? [ownerMember, buyerMember]
        : [ownerMember, buyerMember, newMember];
    });

    render(<DealerCompanyPage />);
    expect(await screen.findByText("李采购")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("成员邮箱"), {
      target: { value: "new@dealer.local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送邀请" }));

    await waitFor(() =>
      expect(mockAddCompanyMember).toHaveBeenCalledWith(7, "new@dealer.local"),
    );
    expect(
      await screen.findByText(/已邀请 new@dealer\.local/),
    ).toBeInTheDocument();
    // 列表刷新后新成员出现（未设置姓名时显示占位）
    expect(await screen.findByText("未设置姓名")).toBeInTheDocument();
  });

  it("邀请提交中按钮禁用并显示「邀请中...」", async () => {
    mockGetMyCompanyId.mockResolvedValue(7);
    mockListCompanyMembers.mockResolvedValue([ownerMember, buyerMember]);
    mockAddCompanyMember.mockReturnValue(new Promise(() => {}));

    render(<DealerCompanyPage />);
    expect(await screen.findByText("李采购")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("成员邮箱"), {
      target: { value: "new@dealer.local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送邀请" }));

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "邀请中..." });
      expect(btn).toBeDisabled();
    });
    expect(screen.getByLabelText("成员邮箱")).toBeDisabled();
  });

  it("邀请 404：提示邮箱未注册，按钮恢复可用", async () => {
    mockGetMyCompanyId.mockResolvedValue(7);
    mockListCompanyMembers.mockResolvedValue([ownerMember, buyerMember]);
    mockAddCompanyMember.mockRejectedValue(
      new ApiError("User with this email does not exist", 404),
    );

    render(<DealerCompanyPage />);
    expect(await screen.findByText("李采购")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("成员邮箱"), {
      target: { value: "ghost@dealer.local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送邀请" }));

    expect(
      await screen.findByText("该邮箱尚未注册，请对方先注册账号后再邀请"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发送邀请" })).not.toBeDisabled();
  });

  it("邀请 409：提示已是企业成员", async () => {
    mockGetMyCompanyId.mockResolvedValue(7);
    mockListCompanyMembers.mockResolvedValue([ownerMember, buyerMember]);
    mockAddCompanyMember.mockRejectedValue(
      new ApiError("User is already a member", 409),
    );

    render(<DealerCompanyPage />);
    expect(await screen.findByText("李采购")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("成员邮箱"), {
      target: { value: "buyer@dealer.local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送邀请" }));

    expect(await screen.findByText("该用户已是企业成员")).toBeInTheDocument();
  });

  it("MEMBER 角色不显示邀请表单，仅显示提示文案", async () => {
    mockUseAuth.mockReturnValue(memberUser);
    mockGetMyCompanyId.mockResolvedValue(7);
    mockListCompanyMembers.mockResolvedValue([ownerMember, buyerMember]);

    render(<DealerCompanyPage />);
    expect(await screen.findByText("李采购（我）")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "发送邀请" })).toBeNull();
    expect(
      screen.getByText("仅企业负责人或管理员可以邀请成员。"),
    ).toBeInTheDocument();
  });

  it("接口 401 时跳转登录页并带上 next", async () => {
    mockGetMyCompanyId.mockRejectedValue(new ApiError("Unauthorized", 401));

    render(<DealerCompanyPage />);
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?next=%2Fdealer%2Fcompany"),
    );
  });

  it("加载失败显示重试按钮，点击后重新加载", async () => {
    let attempts = 0;
    mockGetMyCompanyId.mockImplementation(async () => {
      attempts += 1;
      if (attempts === 1) throw new ApiError("Internal Error", 500);
      return 7;
    });
    mockListCompanyMembers.mockResolvedValue([ownerMember, buyerMember]);

    render(<DealerCompanyPage />);
    expect(await screen.findByText("企业信息加载失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    expect(
      await screen.findByText("测试玩具批发有限公司"),
    ).toBeInTheDocument();
    expect(mockGetMyCompanyId).toHaveBeenCalledTimes(2);
  });
});
