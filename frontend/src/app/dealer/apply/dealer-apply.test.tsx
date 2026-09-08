import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DealerApplyPage from "./page";
import { ApiError } from "@/lib/api/client";
import type { DealerApplication } from "@/lib/api/types";

// mock next/link，避免 jsdom 下 router 报错
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockGetToken = vi.fn();
const mockGetMe = vi.fn();
const mockSetCurrentUser = vi.fn();
const mockClearToken = vi.fn();
vi.mock("@/lib/api/auth", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
  getMe: (...args: unknown[]) => mockGetMe(...args),
  setCurrentUser: (...args: unknown[]) => mockSetCurrentUser(...args),
  clearToken: (...args: unknown[]) => mockClearToken(...args),
}));

const mockCreate = vi.fn();
const mockList = vi.fn();
vi.mock("@/lib/api/dealers", () => ({
  createDealerApplication: (...args: unknown[]) => mockCreate(...args),
  listMyApplications: (...args: unknown[]) => mockList(...args),
}));

function makeApplication(
  overrides: Partial<DealerApplication> = {},
): DealerApplication {
  return {
    id: 5,
    userId: 3,
    companyName: "橙子教学设备有限公司",
    contactName: null,
    contactPhone: null,
    address: null,
    taxId: null,
    status: "PENDING",
    reviewNote: null,
    reviewedById: null,
    reviewedAt: null,
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-01T08:00:00Z",
    companyId: null,
    ...overrides,
  };
}

function makeAuthed() {
  mockGetToken.mockReturnValue("token-1");
  mockGetMe.mockResolvedValue({
    id: 3,
    email: "dealer@wemove.local",
    name: null,
    role: "USER",
  });
}

async function submitForm(companyName: string) {
  fireEvent.change(screen.getByLabelText("公司名称"), {
    target: { value: companyName },
  });
  fireEvent.click(screen.getByRole("button", { name: "提交申请" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("经销商申请页", () => {
  it("匿名用户提示先登录且不触发申请", async () => {
    mockGetToken.mockReturnValue(null);

    render(<DealerApplyPage />);

    expect(
      await screen.findByText(/请先登录，再提交经销商申请/),
    ).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  it("提交失败显示错误、成功后错误被清除且表单让位于待审核提示", async () => {
    makeAuthed();
    const pending = makeApplication({ id: 9, companyName: "新申请的经销商" });
    // 初次加载空列表；提交后的 reconcile 返回权威列表
    mockList.mockResolvedValueOnce([]).mockResolvedValue([pending]);
    // 第一次提交被服务端拒绝，第二次成功
    mockCreate
      .mockRejectedValueOnce(new ApiError("Company name already applied", 400))
      .mockResolvedValueOnce(pending);

    render(<DealerApplyPage />);
    await screen.findByText("暂无申请。");

    // 第一次：失败 → 只有错误，无成功
    await submitForm("重复公司名");
    expect(
      await screen.findByText("Company name already applied"),
    ).toBeInTheDocument();
    expect(screen.queryByText("申请提交成功。")).toBeNull();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // 失败后表单仍在，可再次提交
    expect(
      screen.getByRole("button", { name: "提交申请" }),
    ).toBeEnabled();

    // 第二次：成功 → 错误消失，只显示成功，并切换为待审核提示
    await submitForm("新申请的经销商");
    await waitFor(() =>
      expect(mockCreate).toHaveBeenLastCalledWith({
        companyName: "新申请的经销商",
      }),
    );
    // 成功反馈唯一且保留
    expect(
      await screen.findByText("申请提交成功。"),
    ).toBeInTheDocument();
    // 表单让位于待审核提示（列表已乐观并入新记录）
    expect(
      screen.getByText("你已有一条待审核申请，我们会尽快审核。"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Company name already applied")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("新申请的经销商")).toBeInTheDocument();
    expect(screen.getByText("待审核")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "提交申请" }),
    ).toBeNull();
  });

  it("成功提交后列表拉取失败也保留新申请（不静默回退）", async () => {
    makeAuthed();
    const pending = makeApplication({ id: 9, companyName: "断网后仍可见公司" });
    // 初次加载空列表；提交后的 reconcile 拉取失败
    mockList
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("network down"));
    mockCreate.mockResolvedValue(pending);

    render(<DealerApplyPage />);
    await screen.findByText("暂无申请。");

    await submitForm("断网后仍可见公司");

    // 乐观并入的新申请不因后续拉取失败而消失
    expect(
      await screen.findByText("断网后仍可见公司"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("你已有一条待审核申请，我们会尽快审核。"),
    ).toBeInTheDocument();
    expect(screen.getByText("申请提交成功。")).toBeInTheDocument();
    expect(screen.queryByText("暂无申请。")).toBeNull();
  });

  it("返回用户已有待审核申请时不再显示表单与反馈", async () => {
    makeAuthed();
    mockList.mockResolvedValue([
      makeApplication({ companyName: "已有待审核的公司" }),
    ]);

    render(<DealerApplyPage />);
    // 挂载 effect 的 getMe → loadApplications 异步链需显式冲刷
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      await screen.findByText("你已有一条待审核申请，我们会尽快审核。"),
    ).toBeInTheDocument();
    expect(screen.getByText("已有待审核的公司")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "提交申请" })).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("申请提交成功。")).toBeNull();
  });
});
