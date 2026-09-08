"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/auth";
import { storeAuth } from "@/lib/auth-storage";
import { safeNextPath } from "@/lib/safe-next";
import { nextDestinationLabel } from "@/lib/next-destination";
import { AuthBrand } from "@/components/auth-brand";

export default function LoginPage() {
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  // 登录成功回跳目标（?next=），client-only 读取，SSR 安全
  const [next, setNext] = useState("");

  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get("next") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const result = await login({
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      storeAuth(result.accessToken, result.user);
      const homeByRole: Record<string, string> = {
        ADMIN: "/admin",
        DEALER: "/dealer",
        USER: "/products",
      };
      window.location.assign(
        safeNextPath(next) ?? homeByRole[result.user.role] ?? "/products",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError ? caughtError.message : "登录失败",
      );
    } finally {
      setLoading(false);
    }
  }

  const registerHref = next
    ? `/register?next=${encodeURIComponent(next)}`
    : "/register";

  return (
    <section className="page-shell auth-panel">
      <AuthBrand />
      <p className="eyebrow">账户</p>
      <h1>登录</h1>
      <form onSubmit={submit}>
        <label>
          <span className="field-label">邮箱</span>
          <input
            aria-invalid={error ? true : undefined}
            autoComplete="email"
            name="email"
            required
            type="email"
          />
        </label>
        <div className="field-block">
          <label>
            <span className="field-label">密码</span>
            <input
              aria-invalid={error ? true : undefined}
              autoComplete="current-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <p className="field-hint">密码长度为 8–128 位</p>
          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <button disabled={loading} type="submit">
          {loading ? "正在登录…" : "登录"}
        </button>
        {next ? (
          <p className="destination-hint">
            登录后将回到：<strong>{nextDestinationLabel(next)}</strong>
          </p>
        ) : (
          <p className="destination-hint">
            登录后按账号角色进入对应页面（普通用户进入商品列表）。
          </p>
        )}
      </form>
      <p className="auth-alt">
        还没有账号？{" "}
        <Link href={registerHref} className="link-primary">
          立即注册
        </Link>
      </p>
    </section>
  );
}
