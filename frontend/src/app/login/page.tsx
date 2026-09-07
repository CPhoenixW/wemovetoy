"use client";

import { FormEvent, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { LoginResult } from "@/lib/api/types";
import { storeAuth } from "@/lib/auth-storage";

/** 登录成功回跳目标校验：仅允许站内相对路径（/cart、/products/foo?x=1），
 *  拒绝 //host、https://host、含反斜杠等开放重定向向量。 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (/\\/.test(next)) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(next)) return null;
  return next;
}

export default function LoginPage() {
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<LoginResult>("auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      storeAuth(result.accessToken, result.user);
      const homeByRole: Record<string, string> = {
        ADMIN: "/admin",
        DEALER: "/dealer",
        USER: "/products",
      };
      const rawNext = new URLSearchParams(window.location.search).get("next");
      const next = safeNextPath(rawNext);
      window.location.assign(next ?? homeByRole[result.user.role] ?? "/products");
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError ? caughtError.message : "Unable to sign in",
      );
    } finally {
      setLoading(false);
    }
  }

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
    </section>
  );
}
