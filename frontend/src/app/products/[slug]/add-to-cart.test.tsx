import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AddToCartPanel } from "./add-to-cart";
import { ApiError } from "@/lib/api/client";
import type { ProductVariant } from "@/lib/api/types";

const TOKEN_KEY = "wemove.accessToken";

// mock next/link，避免 jsdom 下 router 报错
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
// 稳定引用：避免每次 render 重建 router 使依赖 [router] 的 load 无限重载
const mockRouter = { push: mockPush, replace: mockReplace };
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

const mockAddToCart = vi.fn();
vi.mock("@/lib/api/cart", () => ({
  addToCart: (...args: unknown[]) => mockAddToCart(...args),
}));

function variants(): ProductVariant[] {
  return [
    {
      id: 11,
      sku: "snake-set-basic",
      name: "Basic",
      options: null,
      price: 44.99,
      isPurchasable: true,
    },
    {
      id: 12,
      sku: "snake-set-pro",
      name: "Pro",
      options: null,
      price: 53.99,
      isPurchasable: true,
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("AddToCartPanel 公开详情加购", () => {
  it("默认选中首个可售 SKU，点加购以该 variantId 与数量调用 addToCart", async () => {
    mockAddToCart.mockResolvedValue({ id: 1 });
    sessionStorage.setItem(TOKEN_KEY, "abc");

    render(<AddToCartPanel productName="Snake Set" variants={variants()} />);

    const basic = screen.getByRole("radio", { name: /Basic/ });
    expect(basic).toHaveAttribute("aria-checked", "true");

    // 数量 +1 后再加购 → quantity=2
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));

    await waitFor(() =>
      expect(mockAddToCart).toHaveBeenCalledWith(11, 2),
    );
  });

  it("加购成功显示成功反馈并可链到购物车", async () => {
    mockAddToCart.mockResolvedValue({ id: 1 });
    sessionStorage.setItem(TOKEN_KEY, "abc");

    render(<AddToCartPanel productName="Snake Set" variants={variants()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));

    await waitFor(() =>
      expect(
        screen.getByText(/Snake Set.*added to cart/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/View cart & checkout/i)).toBeInTheDocument();
  });

  it("切换到不可售 SKU 不会被选中，点击其选项无效", async () => {
    sessionStorage.setItem(TOKEN_KEY, "abc");
    const list = variants();
    list[1].isPurchasable = false; // Pro 不可售

    render(<AddToCartPanel productName="Snake Set" variants={list} />);

    const pro = screen.getByRole("radio", { name: /Pro/ });
    expect(pro).toBeDisabled();
    // Basic 仍为默认选中项
    expect(screen.getByRole("radio", { name: /Basic/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("全部 SKU 不可售时不渲染加购行，显示无现货提示", () => {
    const list = variants().map((v) => ({ ...v, isPurchasable: false }));
    render(<AddToCartPanel productName="Snake Set" variants={list} />);

    expect(screen.queryByRole("button", { name: "Add to cart" })).toBeNull();
    expect(screen.getByText(/No in-stock SKU available/i)).toBeInTheDocument();
  });

  it("游客加购不调接口，跳登录并带 next 回跳参数", async () => {
    // sessionStorage 已清空 → getToken() 为 null
    render(<AddToCartPanel productName="Snake Set" variants={variants()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));

    expect(mockAddToCart).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/login?next="),
    );
  });

  it("会话过期（401）清除后跳登录回跳，不展示接口错误", async () => {
    sessionStorage.setItem(TOKEN_KEY, "expired-token");
    mockAddToCart.mockRejectedValue(new ApiError("Unauthorized", 401));

    render(<AddToCartPanel productName="Snake Set" variants={variants()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/login?next="),
      ),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("服务端拒绝（如库存不足 400）时内联展示错误原文", async () => {
    sessionStorage.setItem(TOKEN_KEY, "abc");
    mockAddToCart.mockRejectedValue(
      new ApiError("Insufficient stock for variant snake-set-pro", 400),
    );

    render(<AddToCartPanel productName="Snake Set" variants={variants()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));

    await waitFor(() =>
      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent("Insufficient stock for variant snake-set-pro"),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
