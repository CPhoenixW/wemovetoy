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
import { dealerStatusMap } from "@/lib/format";

type AuthState = "checking" | "anonymous" | "authed";

const STATUS_LABEL: Record<DealerApplication["status"], string> = {
  PENDING: dealerStatusMap.PENDING.label,
  APPROVED: dealerStatusMap.APPROVED.label,
  REJECTED: dealerStatusMap.REJECTED.label,
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
      await createDealerApplication(input);
      setSuccess(true);
      event.currentTarget.reset();
      await loadApplications();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "提交申请失败",
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
        <p className="eyebrow">经销商</p>
        <h1>申请成为经销商</h1>
        <p className="dealer-application__empty">
          请先<Link href="/login">登录</Link>，再提交经销商申请。
        </p>
      </section>
    );
  }

  const hasPending = applications.some((app) => app.status === "PENDING");

  return (
    <section className="page-shell">
      <p className="eyebrow">经销商</p>
      <h1>申请成为经销商</h1>

      {hasPending ? (
        <p className="dealer-application__notice">
          你已有一条待审核申请，我们会尽快审核。
        </p>
      ) : (
        <form className="dealer-application__form" onSubmit={submit}>
          <label>
            公司名称
            <input
              autoComplete="organization"
              maxLength={200}
              name="companyName"
              required
            />
          </label>
          <label>
            联系人
            <input autoComplete="name" maxLength={100} name="contactName" />
          </label>
          <label>
            联系电话
            <input autoComplete="tel" maxLength={50} name="contactPhone" />
          </label>
          <label>
            地址
            <input
              autoComplete="street-address"
              maxLength={500}
              name="address"
            />
          </label>
          <label>
            税号
            <input maxLength={50} name="taxId" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          {success ? (
            <p className="dealer-application__success">
              申请提交成功。
            </p>
          ) : null}
          <button disabled={submitting} type="submit">
            {submitting ? "提交中…" : "提交申请"}
          </button>
        </form>
      )}

      <section className="dealer-application__list">
        <h2>我的申请</h2>
        {loadingApps ? (
          <p className="dealer-application__empty">加载中…</p>
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
          <p className="dealer-application__empty">暂无申请。</p>
        )}
      </section>
    </section>
  );
}
