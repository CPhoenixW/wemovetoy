"use client";

import { FormEvent, useState } from "react";
import { setCurrentUser, setToken } from "@/lib/api/auth";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { LoginResult } from "@/lib/api/types";

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
      setToken(result.accessToken);
      setCurrentUser(result.user);
      window.location.assign("/products");
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
