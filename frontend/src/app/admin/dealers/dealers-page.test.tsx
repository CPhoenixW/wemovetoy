import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDealersPage from "@/app/admin/dealers/page";
import type { DealerApplication } from "@/lib/api/types";

const mockListAdminApplications = vi.fn();
const mockApproveApplication = vi.fn();
const mockRejectApplication = vi.fn();

vi.mock("@/lib/api/dealers", () => ({
  listAdminApplications: (...args: unknown[]) => mockListAdminApplications(...args),
  approveApplication: (...args: unknown[]) => mockApproveApplication(...args),
  rejectApplication: (...args: unknown[]) => mockRejectApplication(...args),
}));

const pendingApp: DealerApplication = {
  id: 1,
  userId: 10,
  companyName: "测试经销商",
  contactName: "张三",
  contactPhone: "13800000000",
  address: "测试地址",
  taxId: "91110000MA01TEST",
  status: "PENDING",
  reviewNote: null,
  reviewedById: null,
  reviewedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  companyId: null,
};

describe("Dealer 审核页：备注输入与提交锁", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAdminApplications.mockResolvedValue([pendingApp]);
  });

  it("审核弹窗中输入备注后值保留（组件独立定义，不会因父渲染失焦）", async () => {
    const user = userEvent.setup();
    render(<AdminDealersPage />);
    await waitFor(() => expect(screen.getByText("测试经销商")).toBeInTheDocument());

    // 打开批准弹窗
    fireEvent.click(screen.getByRole("button", { name: "批准" }));
    const textarea = await screen.findByLabelText("审核备注（可选）");

    // 连续输入，验证每次输入后值都保留（不失焦）
    await user.type(textarea, "资质齐全，同意");
    expect(textarea).toHaveValue("资质齐全，同意");

    // 再输入一段，验证追加正常
    await user.type(textarea, "通过");
    expect(textarea).toHaveValue("资质齐全，同意通过");
  });

  it("批准操作提交中，确认按钮禁用（提交锁）", async () => {
    mockApproveApplication.mockReturnValue(
      new Promise(() => {}) /* 永远不 resolve，模拟请求中 */,
    );

    render(<AdminDealersPage />);
    await waitFor(() => expect(screen.getByText("测试经销商")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "批准" }));
    const confirmBtn = await screen.findByRole("button", { name: "确认批准" });

    fireEvent.click(confirmBtn);

    // 提交中按钮文案变化且禁用
    await waitFor(() => {
      const processingBtn = screen.getByRole("button", { name: "处理中..." });
      expect(processingBtn).toBeDisabled();
    });
  });

  it("拒绝操作传入备注并调用 reject 接口", async () => {
    const user = userEvent.setup();
    mockRejectApplication.mockResolvedValue({ ...pendingApp, status: "REJECTED" });

    render(<AdminDealersPage />);
    await waitFor(() => expect(screen.getByText("测试经销商")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "拒绝" }));
    const textarea = await screen.findByLabelText("审核备注（可选）");
    await user.type(textarea, "材料不全");

    fireEvent.click(screen.getByRole("button", { name: "确认拒绝" }));

    await waitFor(() => {
      expect(mockRejectApplication).toHaveBeenCalledWith(1, "材料不全");
    });
  });
});
