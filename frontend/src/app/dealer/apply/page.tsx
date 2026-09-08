"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { clearToken, getMe, getToken, setCurrentUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { createDealerApplication, listMyApplications } from "@/lib/api/dealers";
import type {
  CreateDealerApplicationInput,
  DealerApplication,
} from "@/lib/api/types";
import { StatusBadge } from "@/components/ui/status-badge";

type AuthState = "checking" | "anonymous" | "authed";

const STATUS_LABEL: Record<DealerApplication["status"], string> = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
};

export default function DealerApplyPage() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!getToken()) {
      setAuth("anonymous");
      return () => {
        cancelled = true;
      };
    }

    getMe()
      .then((user) => {
        if (cancelled) return;
        setCurrentUser(user);
        setAuth("authed");
        void loadApplications();
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setAuth("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadApplications() {
    setLoadingApps(true);
    try {
      setApplications(await listMyApplications());
    } catch {
      // 申请记录拉取失败不阻塞表单提交
    } finally {
      setLoadingApps(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSuccess(false);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const input: CreateDealerApplicationInput = {
      companyName: String(form.get("companyName") ?? "").trim(),
    };
    const contactName = String(form.get("contactName") ?? "").trim();
    const contactPhone = String(form.get("contactPhone") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const taxId = String(form.get("taxId") ?? "").trim();
    if (contactName) input.contactName = contactName;
    if (contactPhone) input.contactPhone = contactPhone;
    if (address) input.address = address;
    if (taxId) input.taxId = taxId;

    try {
      const created = await createDealerApplication(input);
      // 乐观更新：立即把新申请加入列表
      setApplications((prev) =>
        prev.some((a) => a.id === created.id) ? prev : [created, ...prev],
      );
      event.currentTarget.reset();
      setSuccess(true);
      // 后台最终同步
      void loadApplications();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "提交申请失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (auth === "checking") {
    return (
      <section aria-busy="true" className="page-shell">
        <div className="dealer-application__skeleton dealer-application__skeleton--title" />
        <div className="dealer-application__skeleton dealer-application__skeleton--line" />
        <div className="dealer-application__skeleton dealer-application__skeleton--block" />
      </section>
    );
  }

  if (auth === "anonymous") {
    return (
      <section className="page-shell auth-panel">
        <p className="eyebrow">经销商合作</p>
        <h1>成为 WEMOVE 经销商</h1>
        <p className="dealer-application__empty">
          请先 <Link href="/login">登录</Link> 后再提交经销商申请。
        </p>
      </section>
    );
  }

  const hasPending = applications.some((app) => app.status === "PENDING");

  return (
    <section className="page-shell">
      <p className="eyebrow">经销商合作</p>
      <h1>成为 WEMOVE 经销商</h1>

      <div className="dealer-application__intro">
        <h3>申请说明</h3>
        <ul>
          <li>任何合法注册的企业均可提交经销商申请，审核通过后可登录经销商门户采购商品。</li>
          <li>请准确填写公司名称、联系人、联系电话和地址，便于我们在 3 个工作日内完成审核。</li>
          <li>我们仅在必要范围内使用您提供的信息，用于资质核验和合作联系，不会向第三方披露。</li>
        </ul>
      </div>

      {hasPending ? (
        <p className="dealer-application__notice">
          您已有一份待审核的申请，我们将在近期完成审核，请耐心等待。
        </p>
      ) : (
        <form className="dealer-application__form" onSubmit={submit}>
          <label>
            公司名称<span className="required"> *</span>
            <input
              autoComplete="organization"
              maxLength={200}
              name="companyName"
              required
              placeholder="请填写营业执照上的公司全称"
            />
          </label>
          <label>
            联系人
            <input autoComplete="name" maxLength={100} name="contactName" placeholder="对接人姓名" />
          </label>
          <label>
            联系电话
            <input autoComplete="tel" maxLength={50} name="contactPhone" placeholder="手机号或固定电话" />
          </label>
          <label>
            公司地址
            <input
              autoComplete="street-address"
              maxLength={500}
              name="address"
              placeholder="办公或注册地址"
            />
          </label>
          <label>
            统一社会信用代码
            <input maxLength={50} name="taxId" placeholder="选填，有助于快速核验" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          {success ? (
            <p className="dealer-application__success">
              申请已提交成功，我们将尽快审核。
            </p>
          ) : null}
          <button disabled={submitting} type="submit" className="btn-primary">
            {submitting ? "提交中..." : "提交申请"}
          </button>
        </form>
      )}

      <section className="dealer-application__list">
        <h2>我的申请记录</h2>
        {loadingApps ? (
          <p className="dealer-application__empty">加载中...</p>
        ) : applications.length > 0 ? (
          <ul className="dealer-application__items">
            {applications.map((app) => (
              <li key={app.id}>
                <div className="dealer-application__item-head">
                  <span className="dealer-application__company">
                    {app.companyName}
                  </span>
                  <StatusBadge
                    label={STATUS_LABEL[app.status]}
                    status={app.status}
                  />
                </div>
                {app.reviewNote ? (
                  <p className="dealer-application__note">{app.reviewNote}</p>
                ) : null}
                <p className="dealer-application__date">
                  提交于 {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dealer-application__empty">还没有申请记录。</p>
        )}
      </section>
    </section>
  );
}
