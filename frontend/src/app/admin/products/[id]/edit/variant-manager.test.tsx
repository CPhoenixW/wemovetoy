import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { VariantManager } from "./variant-manager";
import type {
  AdminProductVariant,
  AdminVariant,
  ProductStatus,
} from "@/lib/api/types";

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/api/variants", () => ({
  createAdminVariant: (...args: unknown[]) => mockCreate(...args),
  updateAdminVariant: (...args: unknown[]) => mockUpdate(...args),
  deleteAdminVariant: (...args: unknown[]) => mockDelete(...args),
}));

function makeVariant(over: Partial<AdminVariant> = {}): AdminVariant {
  return {
    id: 1,
    sku: "SKU-RED",
    name: "红色标准版",
    options: { 颜色: "红色" },
    price: 99,
    dealerPrice: 79,
    stock: 10,
    reserved: 2,
    availableStock: 8,
    status: "ACTIVE",
    isPurchasable: true,
    ...over,
  };
}

/** 编辑页传入的初始变体形状（GET /admin/products/:id 的 variants） */
function toInitial(v: AdminVariant): AdminProductVariant {
  return {
    id: v.id,
    sku: v.sku,
    name: v.name,
    options: v.options,
    price: v.price,
    dealerPrice: v.dealerPrice,
    stock: v.stock,
    reserved: v.reserved,
    status: v.status,
    availableStock: v.availableStock,
    isPurchasable: v.isPurchasable,
  };
}

function renderManager(
  initialVariants: AdminProductVariant[],
  productStatus: ProductStatus = "ACTIVE",
) {
  return render(
    <VariantManager
      productId={5}
      productStatus={productStatus}
      initialVariants={initialVariants}
    />,
  );
}

function openCreateModal() {
  fireEvent.click(screen.getByRole("button", { name: "+ 新增 SKU" }));
}

describe("VariantManager SKU 管理", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("渲染已有 SKU 行（含规格标签与库存）", () => {
    renderManager([toInitial(makeVariant())]);

    expect(screen.getByText("SKU-RED")).toBeInTheDocument();
    expect(screen.getByText("红色标准版")).toBeInTheDocument();
    expect(screen.getByText("颜色: 红色")).toBeInTheDocument();
    expect(screen.getByText("10（可用 8）")).toBeInTheDocument();
    expect(screen.getByText("可售")).toBeInTheDocument();
  });

  it("没有 SKU 时显示空态引导", () => {
    renderManager([]);

    expect(screen.getByText("该商品还没有 SKU")).toBeInTheDocument();
  });

  it("新增 SKU：提交后调用创建接口并出现在表格中", async () => {
    mockCreate.mockResolvedValue(
      makeVariant({
        id: 2,
        sku: "SKU-BLUE",
        name: "蓝色标准版",
        price: 100,
        dealerPrice: null,
        stock: 5,
        reserved: 0,
        availableStock: 5,
      }),
    );

    renderManager([toInitial(makeVariant())]);

    openCreateModal();

    fireEvent.change(await screen.findByLabelText(/SKU 编码/), {
      target: { value: "SKU-BLUE" },
    });
    fireEvent.change(screen.getByLabelText(/规格名称/), {
      target: { value: "蓝色标准版" },
    });
    fireEvent.change(screen.getByLabelText(/零售价/), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 5,
          sku: "SKU-BLUE",
          name: "蓝色标准版",
          price: 100,
          stock: 0,
          status: "ACTIVE",
        }),
      );
    });
    expect(await screen.findByText("SKU-BLUE")).toBeInTheDocument();
  });

  it("新增 SKU：必填项缺失时不调用接口并提示", async () => {
    renderManager([]);

    openCreateModal();
    await screen.findByLabelText(/SKU 编码/);
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    expect(await screen.findByText("请填写 SKU 编码和规格名称")).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("关闭后重开新增 SKU 弹窗会重置表单和错误", async () => {
    renderManager([]);

    openCreateModal();
    fireEvent.click(screen.getByRole("button", { name: "创建" }));
    expect(await screen.findByText("请填写 SKU 编码和规格名称")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    openCreateModal();

    expect(await screen.findByLabelText(/SKU 编码/)).toHaveValue("");
    expect(screen.queryByText("请填写 SKU 编码和规格名称")).not.toBeInTheDocument();
  });

  it("新增 SKU：提交中确认按钮禁用，防止重复提交", async () => {
    let resolveCreate: ((v: AdminVariant) => void) | null = null;
    mockCreate.mockReturnValue(
      new Promise<AdminVariant>((resolve) => {
        resolveCreate = resolve;
      }),
    );

    renderManager([]);

    openCreateModal();
    fireEvent.change(await screen.findByLabelText(/SKU 编码/), {
      target: { value: "SKU-NEW" },
    });
    fireEvent.change(screen.getByLabelText(/规格名称/), {
      target: { value: "新版" },
    });
    fireEvent.change(screen.getByLabelText(/零售价/), {
      target: { value: "88" },
    });

    const confirmButton = screen.getByRole("button", { name: "创建" });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(confirmButton).toBeDisabled());
    expect(screen.getByRole("button", { name: "保存中..." })).toBeDisabled();

    resolveCreate!(makeVariant({ id: 9, sku: "SKU-NEW", name: "新版", price: 88 }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  });

  it("编辑 SKU：表单预填原值，保存后调用更新接口", async () => {
    mockUpdate.mockResolvedValue(
      makeVariant({ id: 1, name: "红色升级版", price: 109 }),
    );

    renderManager([toInitial(makeVariant())]);

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));

    const nameInput = await screen.findByDisplayValue("红色标准版");
    fireEvent.change(nameInput, { target: { value: "红色升级版" } });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "红色升级版" }),
      );
    });
    expect(await screen.findByText("红色升级版")).toBeInTheDocument();
  });

  it("关闭后重开编辑 SKU 弹窗会恢复原值并清除错误", async () => {
    renderManager([toInitial(makeVariant())]);

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));
    fireEvent.change(await screen.findByLabelText(/规格名称/), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
    expect(await screen.findByText("请填写 SKU 编码和规格名称")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "编辑" }));

    expect(await screen.findByLabelText(/规格名称/)).toHaveValue("红色标准版");
    expect(screen.queryByText("请填写 SKU 编码和规格名称")).not.toBeInTheDocument();
  });

  it.each([
    ["负数", "-1"],
    ["小数", "1.5"],
  ])("新增 SKU：库存为%s时不请求接口", async (_kind, stock) => {
    renderManager([]);

    openCreateModal();
    fireEvent.change(await screen.findByLabelText(/SKU 编码/), {
      target: { value: "SKU-STOCK" },
    });
    fireEvent.change(screen.getByLabelText(/规格名称/), {
      target: { value: "库存校验" },
    });
    fireEvent.change(screen.getByLabelText(/零售价/), {
      target: { value: "100" },
    });
    const stockInput = screen.getByLabelText(/库存数量/) as HTMLInputElement;
    expect(stockInput.step).toBe("1");
    fireEvent.change(stockInput, { target: { value: stock } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    expect(await screen.findByText("库存必须是非负整数")).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["DRAFT", "商品草稿"],
    ["ARCHIVED", "商品已下架"],
  ] as const)("%s 商品的 SKU 一律不可售", (productStatus, label) => {
    renderManager([toInitial(makeVariant())], productStatus);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText("可售")).not.toBeInTheDocument();
  });

  it("新增 SKU 时保留服务端返回的不可售状态", async () => {
    mockCreate.mockResolvedValue(
      makeVariant({ stock: 10, reserved: 0, isPurchasable: false }),
    );
    renderManager([]);

    openCreateModal();
    fireEvent.change(await screen.findByLabelText(/SKU 编码/), {
      target: { value: "SKU-SERVER-UNAVAILABLE" },
    });
    fireEvent.change(screen.getByLabelText(/规格名称/), {
      target: { value: "服务端不可售" },
    });
    fireEvent.change(screen.getByLabelText(/零售价/), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    expect(await screen.findByText("缺货")).toBeInTheDocument();
    expect(screen.queryByText("可售")).not.toBeInTheDocument();
  });

  it("删除 SKU：确认后调用删除接口并从表格移除", async () => {
    mockDelete.mockResolvedValue(undefined);

    renderManager([toInitial(makeVariant())]);

    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    const dialog = (await screen.findByText("确认删除 SKU")).closest(
      ".modal-content",
    ) as HTMLElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "删除" }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.queryByText("SKU-RED")).not.toBeInTheDocument(),
    );
  });

  it("删除已被引用的 SKU 时提示服务端 409 且保留错误", async () => {
    mockDelete.mockRejectedValue(new Error("该 SKU 已被订单引用"));
    renderManager([toInitial(makeVariant())]);

    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    const dialog = (await screen.findByText("确认删除 SKU")).closest(
      ".modal-content",
    ) as HTMLElement;
    expect(
      within(dialog).getByText(/服务端会拒绝删除并返回 409/),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByText(/历史订单不受影响/),
    ).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "删除" }));

    expect(await within(dialog).findByText("该 SKU 已被订单引用")).toBeInTheDocument();
    expect(screen.getByText("确认删除 SKU")).toBeInTheDocument();
    expect(mockDelete).toHaveBeenCalledWith(1);
  });

  it("接口报错时展示错误信息且不关闭弹窗", async () => {
    mockCreate.mockRejectedValue(new Error("SKU 编码已存在"));

    renderManager([]);

    openCreateModal();
    fireEvent.change(await screen.findByLabelText(/SKU 编码/), {
      target: { value: "SKU-DUP" },
    });
    fireEvent.change(screen.getByLabelText(/规格名称/), {
      target: { value: "重复规格" },
    });
    fireEvent.change(screen.getByLabelText(/零售价/), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));

    expect(await screen.findByText("SKU 编码已存在")).toBeInTheDocument();
    // 弹窗仍在，可修改后重试
    expect(screen.getByLabelText(/SKU 编码/)).toBeInTheDocument();
  });
});
