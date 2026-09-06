"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { createDealerApplication, listMyApplications } from "@/lib/api/dealers";
import type {
  CreateDealerApplicationInput,
  DealerApplication,
} from "@/lib/api/types";
import { getStoredToken } from "@/lib/auth-storage";

type AuthState = "checking" | "anonymous" | "authed";

const STATUS_LABEL: Record<DealerApplication["status"], string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export default function DealerApplyPage() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setAuth("anonymous");
      return;
    }
    setToken(stored);
    setAuth("authed");
    void loadApplications(stored);
  }, []);

  async function loadApplications(accessToken: string) {
    setLoadingApps(true);
    try {
      setApplications(await listMyApplications(accessToken));
    } catch {
      // 申请记录拉取失败不阻塞表单提交
    } finally {
      setLoadingApps(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
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
      await createDealerApplication(token, input);
      setSuccess(true);
      event.currentTarget.reset();
      await loadApplications(token);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Unable to submit application",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (auth === "checking") {
    return (
      <section aria-busy="true" className="page-shell">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--block" />
      </section>
    );
  }

  if (auth === "anonymous") {
    return (
      <section className="page-shell auth-panel">
        <p className="eyebrow">Dealer</p>
        <h1>Become a dealer</h1>
        <p className="empty-state">
          Please <Link href="/login">sign in</Link> to apply as a dealer.
        </p>
      </section>
    );
  }

  const hasPending = applications.some((app) => app.status === "PENDING");

  return (
    <section className="page-shell">
      <p className="eyebrow">Dealer</p>
      <h1>Become a dealer</h1>

      {hasPending ? (
        <p className="notice">
          You already have a pending application. We will review it shortly.
        </p>
      ) : (
        <form className="dealer-form" onSubmit={submit}>
          <label>
            Company name
            <input
              autoComplete="organization"
              maxLength={200}
              name="companyName"
              required
            />
          </label>
          <label>
            Contact name
            <input autoComplete="name" maxLength={100} name="contactName" />
          </label>
          <label>
            Contact phone
            <input autoComplete="tel" maxLength={50} name="contactPhone" />
          </label>
          <label>
            Address
            <input
              autoComplete="street-address"
              maxLength={500}
              name="address"
            />
          </label>
          <label>
            Tax ID
            <input maxLength={50} name="taxId" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          {success ? (
            <p className="form-success">Application submitted successfully.</p>
          ) : null}
          <button disabled={submitting} type="submit">
            {submitting ? "Submitting" : "Submit application"}
          </button>
        </form>
      )}

      <section className="application-list">
        <h2>My applications</h2>
        {loadingApps ? (
          <p className="empty-state">Loading…</p>
        ) : applications.length > 0 ? (
          <ul className="application-list__items">
            {applications.map((app) => (
              <li key={app.id}>
                <div className="application-list__head">
                  <span className="application-list__company">
                    {app.companyName}
                  </span>
                  <span
                    className={`status-badge status-badge--${app.status.toLowerCase()}`}
                  >
                    {STATUS_LABEL[app.status]}
                  </span>
                </div>
                {app.reviewNote ? (
                  <p className="application-list__note">{app.reviewNote}</p>
                ) : null}
                <p className="application-list__date">
                  Submitted {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No applications yet.</p>
        )}
      </section>
    </section>
  );
}
