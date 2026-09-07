import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "@/components/ui/modal";

describe("Modal 提交锁（confirmDisabled）", () => {
  it("confirmDisabled 为 false 时确认按钮可点击", () => {
    const onConfirm = vi.fn();
    render(
      <Modal
        open
        onClose={() => {}}
        title="测试"
        confirmText="确认"
        confirmDisabled={false}
        onConfirm={onConfirm}
      >
        内容
      </Modal>,
    );

    const btn = screen.getByRole("button", { name: "确认" });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("confirmDisabled 为 true 时确认按钮禁用，点击不触发 onConfirm", () => {
    const onConfirm = vi.fn();
    render(
      <Modal
        open
        onClose={() => {}}
        title="测试"
        confirmText="提交中..."
        confirmDisabled={true}
        onConfirm={onConfirm}
      >
        内容
      </Modal>,
    );

    const btn = screen.getByRole("button", { name: "提交中..." });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("不传 onConfirm 时不渲染底部按钮", () => {
    render(
      <Modal open onClose={() => {}} title="只读">
        内容
      </Modal>,
    );

    expect(screen.queryByRole("button", { name: "确认" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "取消" })).not.toBeInTheDocument();
  });
});
