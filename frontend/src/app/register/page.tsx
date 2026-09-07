"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { login, register } from "@/lib/api/auth";
import { storeAuth } from "@/lib/auth-storage";
import { safeNextPath } from "@/lib/safe-next";

export default function RegisterPage() {
  const [error, setError] = useState<string>();
  // 账号已建但自动登录失败 → 提示去登录页
  const [loginFallback, setLoginFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState("");

  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get("next") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setLoginFallback(false);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    try {
      // 注册接口仅返回用户、不含 token
      await register({ email, password, name: name || undefined });
      // 自动登录拿 token，体验与登录一致
      const result = await login({ email, password });
      storeAuth(result.accessToken, result.user);
      window.location.assign(safeNextPath(next) ?? "/products");
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
        // 401/403 出现在 login 阶段（注册已成功）而非 register 阶段
        setLoginFallback(
          caughtError.status === 401 || caughtError.status === 403,
        );
      } else {
        setError("Unable to create account");
      }
    } finally {
      setLoading(false);
    }
  }

  const loginHref = next
    ? `/login?next=${encodeURIComponent(next)}`
    : "/login";

  return (
    <section className="page-shell auth-panel">
      <p className="eyebrow">Account</p>
      <h1>Create account</h1>
      <p className="page-subtitle">
        Register a consumer account to shop the WEMOVE storefront.
      </p>
      <form onSubmit={submit}>
        <label>
          Name{" "}
          <span className="muted-text">(optional)</span>
          <input autoComplete="name" name="name" type="text" />
        </label>
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label>
          Password
          <input
            autoComplete="new-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {loginFallback ? (
          <p className="auth-alt">
            Your account was created, but automatic sign-in failed.{" "}
            <Link href={loginHref} className="link-primary">
              Go to sign in
            </Link>
          </p>
        ) : null}
        <button disabled={loading} type="submit">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="auth-alt">
        Already have an account?{" "}
        <Link href={loginHref} className="link-primary">
          Sign in
        </Link>
      </p>
    </section>
  );
}
