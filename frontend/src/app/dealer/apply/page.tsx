"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
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

/** 提交反馈：成功/失败二选一，结构上保证不会同时出现。 */
interface SubmitFeedback {
  kind: "success" | "error";
  message: string;
}

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
  const [feedback, setFeedback] = useState<SubmitFeedback | null>(null);
  // 拉取序号守卫：提交后并发触发的旧列表响应不得覆盖新状态
  const loadSeq = useRef(0);

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
    const seq = ++loadSeq.current;
    setLoadingApps(true);
    try {
      const next = await listMyApplications();
      if (seq !== loadSeq.current) return; // 已有更新的拉取，丢弃过期结果
      setApplications(next);
    } catch {
      // 拉取失败：保留当前列表（含刚提交乐观并入的记录），不静默置空
    } finally {
      if (seq === loadSeq.current) setLoadingApps(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setSubmitting(true);

    // 在 await 前同步取表单元素：异步期间 React 已释放合成事件的 currentTarget，
    // 若之后再 event.currentTarget.reset() 会抛错，被 catch 当成“失败”，并中断列表刷新
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
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
      // 乐观并入新建申请：即使随后的列表拉取失败/被并发覆盖，表单也能即时切换为待审核提示、列表也能立刻看到新记录
      setApplications((prev) =>
        prev.some((app) => app.id === created.id)
          ? prev
          : [created, ...prev],
      );
      setFeedback({ kind: "success", message: "申请提交成功。" });
      formEl.reset();
      await loadApplications();
    } catch (caught) {
      setFeedback({
        kind: "error",
        message:
          caught instanceof ApiError ? caught.message : "提交申请失败",
      });
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

      {feedback ? (
        feedback.kind === "success" ? (
          <p className="dealer-application__success" role="status">
            {feedback.message}
          </p>
        ) : (
          <p className="form-error" role="alert">
            {feedback.message}
          </p>
        )
      ) : null}

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
