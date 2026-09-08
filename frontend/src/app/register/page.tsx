"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { login, register } from "@/lib/api/auth";
import { storeAuth } from "@/lib/auth-storage";
import { safeNextPath } from "@/lib/safe-next";
import { nextDestinationLabel } from "@/lib/next-destination";
import { AuthBrand } from "@/components/auth-brand";

/** 注册后自动登录失败的状态：由后端消息反向定位到具体输入框 */
function fieldForServerError(message: string): "email" | "password" | "name" | null {
  const text = message.toLowerCase();
  if (text.includes("already exists")) return "email";
  if (text.includes("email") && !text.includes("password")) return "email";
  if (text.includes("password") && !text.includes("email")) return "password";
  if (text.includes("name")) return "name";
  return null;
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // 字段级错误（内联在对应输入框下方）
  const [fieldError, setFieldError] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  // 未定位到字段的服务端错误（展示在提交按钮上方）
  const [serverError, setServerError] = useState<string>();
  // 账号已建但自动登录失败 → 提示去登录页
  const [loginFallback, setLoginFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState("");

  useEffect(() => {
    setNext(new URLSearchParams(window.location.search).get("next") ?? "");
  }, []);

  function clearField(key: keyof typeof fieldError) {
    setFieldError((current) => {
      if (!current[key]) return current;
      const nextState = { ...current };
      delete nextState[key];
      return nextState;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(undefined);
    setLoginFallback(false);
    setFieldError({});
    setLoading(true);

    try {
      // 注册接口仅返回用户、不含 token
      await register({ email: email.trim(), password, name: name.trim() || undefined });
      // 自动登录拿 token，体验与登录一致
      const result = await login({ email: email.trim(), password });
      storeAuth(result.accessToken, result.user);
      window.location.assign(safeNextPath(next) ?? "/products");
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        if (caughtError.status === 401 || caughtError.status === 403) {
          // 注册已成功、自动登录失败：提示去登录页，不做字段错误
          setLoginFallback(true);
        } else {
          const message = caughtError.message;
          const field = fieldForServerError(message);
          if (field) {
            setFieldError((current) => ({ ...current, [field]: message }));
          } else {
            setServerError(message);
          }
        }
      } else {
        setServerError("创建账号失败");
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
      <AuthBrand />
      <p className="eyebrow">账户</p>
      <h1>创建账号</h1>
      <p className="page-subtitle">
        注册普通用户账号，畅购 WEMOVE 商城。
      </p>
      <form onSubmit={submit}>
        <div className="field-block">
          <label>
            <span className="field-label">
              姓名 <span className="muted-text">（选填，最多 100 字）</span>
            </span>
            <input
              aria-invalid={fieldError.name ? true : undefined}
              autoComplete="name"
              maxLength={100}
              name="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearField("name");
              }}
            />
          </label>
          {fieldError.name ? (
            <p className="field-error" role="alert">
              {fieldError.name}
            </p>
          ) : null}
        </div>
        <div className="field-block">
          <label>
            <span className="field-label">邮箱</span>
            <input
              aria-invalid={fieldError.email ? true : undefined}
              autoComplete="email"
              name="email"
              required
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearField("email");
              }}
            />
          </label>
          {fieldError.email ? (
            <p className="field-error" role="alert">
              {fieldError.email}
            </p>
          ) : null}
        </div>
        <div className="field-block">
          <label>
            <span className="field-label">密码</span>
            <input
              aria-invalid={fieldError.password ? true : undefined}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              name="password"
              required
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearField("password");
              }}
            />
          </label>
          <ul className="pwd-rules" aria-label="密码规则">
            <li className={password.length >= 8 ? "is-met" : undefined}>
              至少 8 位字符
            </li>
            <li className={password.length <= 128 ? "is-met" : undefined}>
              不超过 128 位字符
            </li>
          </ul>
          {fieldError.password ? (
            <p className="field-error" role="alert">
              {fieldError.password}
            </p>
          ) : null}
        </div>
        {serverError ? (
          <p className="form-error" role="alert">
            {serverError}
          </p>
        ) : null}
        {loginFallback ? (
          <p className="auth-alt">
            账号已创建，但自动登录失败。{" "}
            <Link href={loginHref} className="link-primary">
              去登录
            </Link>
          </p>
        ) : null}
        <button disabled={loading} type="submit">
          {loading ? "正在创建账号…" : "创建账号"}
        </button>
        {next ? (
          <p className="destination-hint">
            创建账号并登录后，将回到：<strong>{nextDestinationLabel(next)}</strong>
          </p>
        ) : (
          <p className="destination-hint">
            创建账号并登录后，普通用户进入商品列表。
          </p>
        )}
      </form>
      <p className="auth-alt">
        已有账号？{" "}
        <Link href={loginHref} className="link-primary">
          去登录
        </Link>
      </p>
    </section>
  );
}
