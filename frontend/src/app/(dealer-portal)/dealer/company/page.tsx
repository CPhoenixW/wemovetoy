"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api/client";
import {
  addCompanyMember,
  getCompany,
  getMyCompanyId,
  listCompanyMembers,
} from "@/lib/api/dealers";
import { useAuth } from "@/lib/hooks/use-auth";
import type {
  DealerCompany,
  DealerMember,
  DealerMemberRole,
} from "@/lib/api/types";
import { formatDate } from "@/lib/format";

const roleLabels: Record<DealerMemberRole, string> = {
  OWNER: "负责人",
  ADMIN: "管理员",
  MEMBER: "成员",
};

export default function DealerCompanyPage() {
  const router = useRouter();
  const me = useAuth("DEALER");

  const [company, setCompany] = useState<DealerCompany | null>(null);
  const [members, setMembers] = useState<DealerMember[]>([]);
  const [noCompany, setNoCompany] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 邀请成员
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteOk, setInviteOk] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const companyId = await getMyCompanyId();
      if (companyId == null) {
        setNoCompany(true);
        return;
      }
      const [companyData, membersData] = await Promise.all([
        getCompany(companyId),
        listCompanyMembers(companyId),
      ]);
      setCompany(companyData);
      setMembers(membersData);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login?next=%2Fdealer%2Fcompany");
        return;
      }
      setError(err instanceof Error ? err.message : "加载企业信息失败");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // 当前登录用户在企业内的角色（用于决定是否显示邀请入口）
  const myMember = me ? members.find((m) => m.userId === me.id) : undefined;
  const canInvite =
    myMember?.role === "OWNER" || myMember?.role === "ADMIN";

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviting || !company) return;
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError("请输入要邀请的成员邮箱");
      return;
    }
    setInviting(true);
    setInviteError("");
    setInviteOk("");
    try {
      await addCompanyMember(company.id, email);
      setInviteOk(`已邀请 ${email} 加入企业（角色：成员）`);
      setInviteEmail("");
      // 刷新成员列表
      const refreshed = await listCompanyMembers(company.id);
      setMembers(refreshed);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setInviteError("该邮箱尚未注册，请对方先注册账号后再邀请");
        } else if (err.status === 409) {
          setInviteError("该用户已是企业成员");
        } else if (err.status === 403) {
          setInviteError("仅企业负责人或管理员可以邀请成员");
        } else {
          setInviteError(err.message || "邀请失败，请重试");
        }
      } else {
        setInviteError(err instanceof Error ? err.message : "邀请失败，请重试");
      }
    } finally {
      setInviting(false);
    }
  }

  const memberColumns: Column<DealerMember>[] = [
    {
      key: "name",
      header: "成员",
      render: (member) => (
        <>
          <span className="cart-item-name">
            {member.user.name ?? "未设置姓名"}
            {myMember?.id === member.id ? "（我）" : ""}
          </span>
          <br />
          <span className="muted-text">{member.user.email}</span>
        </>
      ),
    },
    {
      key: "role",
      header: "角色",
      className: "col-id",
      render: (member) => (
        <StatusBadge
          status={member.role === "MEMBER" ? "default" : "approved"}
          label={roleLabels[member.role]}
        />
      ),
    },
    {
      key: "createdAt",
      header: "加入时间",
      className: "col-date",
      render: (member) => formatDate(member.createdAt),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Dealer Portal</p>
          <h1>我的企业</h1>
        </div>
      </div>

      {loading ? (
        <p className="page-loading">加载中...</p>
      ) : noCompany ? (
        <EmptyState
          title="你还没有关联企业"
          description="经销商入驻申请审核通过后，系统会自动创建企业。提交申请并等待管理员审核即可。"
          action={
            <Link href="/dealer/apply" className="btn-primary">
              去提交入驻申请
            </Link>
          }
        />
      ) : error && !company ? (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3>企业信息加载失败</h3>
          <p>{error}</p>
          <div className="empty-action">
            <button type="button" className="btn-secondary" onClick={load}>
              重试
            </button>
          </div>
        </div>
      ) : company ? (
        <div className="company-detail">
          <div className="company-head">
            <h2 className="company-name">{company.name}</h2>
            <StatusBadge
              status={company.status === "ACTIVE" ? "active" : "rejected"}
              label={company.status === "ACTIVE" ? "正常" : "已停用"}
            />
          </div>

          <dl className="order-meta">
            {company.contactName ? (
              <div>
                <dt>联系人</dt>
                <dd>{company.contactName}</dd>
              </div>
            ) : null}
            {company.contactPhone ? (
              <div>
                <dt>联系电话</dt>
                <dd>{company.contactPhone}</dd>
              </div>
            ) : null}
            {company.address ? (
              <div>
                <dt>地址</dt>
                <dd>{company.address}</dd>
              </div>
            ) : null}
            {company.taxId ? (
              <div>
                <dt>税号</dt>
                <dd>{company.taxId}</dd>
              </div>
            ) : null}
          </dl>

          <h2 className="section-title">企业成员（{members.length}）</h2>
          {members.length ? (
            <DataTable<DealerMember>
              columns={memberColumns}
              data={members}
              rowKey={(member) => member.id}
            />
          ) : (
            <p className="muted-text">暂无成员数据。</p>
          )}

          {canInvite ? (
            <div className="invite-panel">
              <h2 className="section-title">邀请成员</h2>
              <p className="muted-text">
                输入已注册用户的邮箱，邀请其以「成员」角色加入企业。
              </p>
              <form className="invite-form" onSubmit={handleInvite}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviting}
                  aria-label="成员邮箱"
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={inviting}
                >
                  {inviting ? "邀请中..." : "发送邀请"}
                </button>
              </form>
              {inviteError ? (
                <p className="form-error">{inviteError}</p>
              ) : null}
              {inviteOk ? <p className="form-success">{inviteOk}</p> : null}
            </div>
          ) : (
            <p className="muted-text invite-hint">
              仅企业负责人或管理员可以邀请成员。
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
