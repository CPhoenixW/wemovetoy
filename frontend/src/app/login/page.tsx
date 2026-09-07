"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/auth";
import { storeAuth } from "@/lib/auth-storage";
import { safeNextPath } from "@/lib/safe-next";

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
        caughtError instanceof ApiError ? caughtError.message : "Unable to sign in",
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
      <p className="eyebrow">Account</p>
      <h1>Sign in</h1>
      <form onSubmit={submit}>
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button disabled={loading} type="submit">
          {loading ? "Signing in" : "Sign in"}
        </button>
      </form>
      <p className="auth-alt">
        Don&apos;t have an account?{" "}
        <Link href={registerHref} className="link-primary">
          Create one
        </Link>
      </p>
    </section>
  );
}
