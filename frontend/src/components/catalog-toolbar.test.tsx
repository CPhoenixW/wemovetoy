import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CatalogToolbar } from "./catalog-toolbar";
import type { ProductSort } from "@/lib/api/types";

const mockPush = vi.fn();
// 稳定引用：避免每次 render 重建 router 使效果依赖抖动
const mockRouter = { push: mockPush };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

const SORTS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "最新上架" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
];

const openTrigger = () =>
  screen.getByRole("button", { name: "选择排序方式" });

const drawerOptions = () =>
  screen.getAllByRole("button").filter((b) =>
    b.className.includes("catalog-drawer__option"),
  );

/** 直接点开抽屉（等价移动端点“排序”按钮）。 */
function openDrawer(sort?: ProductSort) {
  render(<CatalogToolbar search="" sorts={SORTS} sort={sort} />);
  fireEvent.click(openTrigger());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CatalogToolbar 移动端排序抽屉", () => {
  it("默认不渲染抽屉", () => {
    render(<CatalogToolbar search="" sorts={SORTS} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("打开后焦点进入弹窗并落在当前选中项", () => {
    openDrawer("newest");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // 焦点应从“排序”触发按钮移入弹窗，指向当前生效排序
    expect(openTrigger()).not.toHaveFocus();
    expect(
      screen.getByRole("button", { name: /最新上架/ }),
    ).toHaveFocus();
  });

  it("Esc 关闭抽屉并把焦点还给排序按钮", () => {
    openDrawer();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(openTrigger()).toHaveFocus();
  });

  it("Tab 在抽屉内循环：末尾项 Tab 回到首个可聚焦元素", () => {
    openDrawer();
    const options = drawerOptions();
    const last = options[options.length - 1]; // 价格从高到低
    last.focus();
    expect(last).toHaveFocus();

    fireEvent.keyDown(last, { key: "Tab", code: "Tab" });

    // 不逃逸到背景，回绕到抽屉第一个可聚焦元素（关闭按钮）
    expect(screen.getByRole("button", { name: "关闭" })).toHaveFocus();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Shift+Tab 从首个可聚焦元素回绕到末尾项", () => {
    openDrawer();
    screen.getByRole("button", { name: "关闭" }).focus();

    fireEvent.keyDown(screen.getByRole("button", { name: "关闭" }), {
      key: "Tab",
      code: "Tab",
      shiftKey: true,
    });

    const options = drawerOptions();
    expect(options[options.length - 1]).toHaveFocus();
  });

  it("选中排序项后关闭抽屉并跳转对应 URL", () => {
    openDrawer();

    fireEvent.click(screen.getByRole("button", { name: /价格从低到高/ }));

    expect(mockPush).toHaveBeenCalledWith("/products?sort=price_asc");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
