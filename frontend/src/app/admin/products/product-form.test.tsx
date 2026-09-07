import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductForm } from "@/app/admin/products/product-form";
import type { AdminProductDetail, ProductInput } from "@/lib/api/types";

const baseInitial: AdminProductDetail = {
  id: 1,
  name: "测试商品",
  slug: "test-product",
  shortDescription: "简介",
  description: "详细描述",
  price: 99,
  dealerPrice: 60,
  ageMin: 3,
  ageMax: 12,
  playEnvironment: "户外",
  status: "ACTIVE",
  features: ["枫木", "支架"],
  specifications: { 材质: "枫木" },
  categoryId: 1,
  category: { id: 1, name: "滑板", slug: "skateboard" },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  variants: [
    {
      id: 1,
      sku: "TEST-001",
      name: "标准款",
      options: null,
      price: 99,
      dealerPrice: 60,
      stock: 100,
      reserved: 0,
      status: "ACTIVE",
    },
  ],
};

describe("ProductForm", () => {
  it("状态下拉包含 ARCHIVED 选项，不包含 INACTIVE", () => {
    render(<ProductForm submitText="保存" onSubmit={() => Promise.resolve()} />);
    const select = screen.getByLabelText("状态") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain("ARCHIVED");
    expect(values).not.toContain("INACTIVE");
    expect(values).toEqual(expect.arrayContaining(["DRAFT", "ACTIVE", "ARCHIVED"]));
  });

  it("编辑时清空可选字段，提交时显式传 null/[]/{}", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(input: ProductInput) => Promise<void>>(() => Promise.resolve());

    render(<ProductForm initial={baseInitial} submitText="保存" onSubmit={onSubmit} />);

    // 清空经销商价
    await user.clear(screen.getByLabelText("经销商价（元，留空表示无）"));
    // 清空分类
    await user.clear(screen.getByLabelText("分类 ID（可选）"));
    // 清空最小年龄
    await user.clear(screen.getByLabelText("最小适用年龄"));
    // 清空最大年龄
    await user.clear(screen.getByLabelText("最大适用年龄"));
    // 清空游玩环境
    await user.clear(screen.getByLabelText("游玩环境（可选）"));
    // 清空特性
    await user.clear(screen.getByLabelText("商品特性（英文逗号分隔，可选）"));
    // 清空规格 JSON
    await user.clear(screen.getByLabelText("规格（JSON，可选）"));

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const input = onSubmit.mock.calls[0][0];

    expect(input.dealerPrice).toBeNull();
    expect(input.categoryId).toBeNull();
    expect(input.ageMin).toBeNull();
    expect(input.ageMax).toBeNull();
    expect(input.playEnvironment).toBeNull();
    expect(input.features).toEqual([]);
    expect(input.specifications).toEqual({});
  });

  it("填写规格 JSON 时正确解析为对象", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn() as import("vitest").Mock<(input: ProductInput) => Promise<void>>;

    render(<ProductForm submitText="保存" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/^商品名称/), "测试商品");
    await user.type(screen.getByLabelText(/^Slug/), "test");
    await user.type(screen.getByLabelText(/^简短描述/), "简介");
    await user.type(screen.getByLabelText(/^详细描述/), "描述");
    await user.type(screen.getByLabelText(/^零售价/), "99");
    fireEvent.change(screen.getByLabelText("规格（JSON，可选）"), {
      target: { value: '{"材质":"枫木"}' },
    });

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].specifications).toEqual({ 材质: "枫木" });
  });

  it("规格 JSON 格式错误时阻止提交并报错", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(input: ProductInput) => Promise<void>>(() => Promise.resolve());

    render(<ProductForm submitText="保存" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/^商品名称/), "测试商品");
    await user.type(screen.getByLabelText(/^Slug/), "test");
    await user.type(screen.getByLabelText(/^简短描述/), "简介");
    await user.type(screen.getByLabelText(/^详细描述/), "描述");
    await user.type(screen.getByLabelText(/^零售价/), "99");
    const specInput2 = screen.getByLabelText("规格（JSON，可选）");
    fireEvent.change(specInput2, { target: { value: "{非法 json" } });

    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("规格 JSON 格式不正确")).toBeInTheDocument();
  });
});
