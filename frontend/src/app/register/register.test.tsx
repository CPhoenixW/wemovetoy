import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RegisterPage from "./page";
import { ApiError } from "@/lib/api/client";

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

const mockRegister = vi.fn();
const mockLogin = vi.fn();
vi.mock("@/lib/api/auth", () => ({
  register: (...args: unknown[]) => mockRegister(...args),
  login: (...args: unknown[]) => mockLogin(...args),
}));

/** 直供 search 与 assign，避免跨用例改 window.location 残留/依赖 history */
function mockWindowLocation(search = "") {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { search, assign },
  });
  return assign;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

function fillForm(name?: string) {
  if (name) {
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: name },
    });
  }
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "new@wemove.local" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "ChangeMe123!" },
  });
}

describe("注册页", () => {
  it("无 next 时注册成功→自动登录→存 token 回首页", async () => {
    const assign = mockWindowLocation();
    mockRegister.mockResolvedValue({ id: 3, email: "new@wemove.local", name: null, role: "USER" });
    mockLogin.mockResolvedValue({
      accessToken: "token-123",
      user: { id: 3, email: "new@wemove.local", name: null, role: "USER" },
    });

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        email: "new@wemove.local",
        password: "ChangeMe123!",
        name: undefined,
      }),
    );
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({
        email: "new@wemove.local",
        password: "ChangeMe123!",
      }),
    );
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/products"));
    expect(sessionStorage.getItem("wemove.accessToken")).toBe("token-123");
  });

  it("携带 next 且带 name 时自动登录并回跳原页", async () => {
    const assign = mockWindowLocation("?next=%2Fproducts%2Frobot");
    mockRegister.mockResolvedValue({ id: 3, email: "new@wemove.local", name: "Lin", role: "USER" });
    mockLogin.mockResolvedValue({
      accessToken: "t",
      user: { id: 3, email: "new@wemove.local", name: "Lin", role: "USER" },
    });

    render(<RegisterPage />);
    fillForm("Lin");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        email: "new@wemove.local",
        password: "ChangeMe123!",
        name: "Lin",
      }),
    );
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith("/products/robot"),
    );
  });

  it("重复邮箱(409)内联展示错误原文且不跳转、不自动登录", async () => {
    const assign = mockWindowLocation();
    mockRegister.mockRejectedValue(
      new ApiError("An account with this email already exists", 409),
    );

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(
        screen.getByText("An account with this email already exists"),
      ).toBeInTheDocument(),
    );
    expect(mockLogin).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("账号已建但自动登录失败时提示去登录页", async () => {
    const assign = mockWindowLocation();
    mockRegister.mockResolvedValue({ id: 3, email: "new@wemove.local", name: null, role: "USER" });
    mockLogin.mockRejectedValue(new ApiError("Invalid email or password", 401));

    render(<RegisterPage />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(screen.getByText(/Go to sign in/i)).toBeInTheDocument(),
    );
    expect(assign).not.toHaveBeenCalled();
  });
});
