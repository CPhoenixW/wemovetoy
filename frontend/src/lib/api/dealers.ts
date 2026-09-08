import { apiRequest } from "./client";
import type {
  CreateDealerApplicationInput,
  DealerApplication,
  DealerApplicationStatus,
  DealerCompany,
  DealerMember,
} from "./types";

export function createDealerApplication(
  input: CreateDealerApplicationInput,
): Promise<DealerApplication> {
  return apiRequest<DealerApplication>("dealers/applications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listMyApplications(): Promise<DealerApplication[]> {
  return apiRequest<DealerApplication[]>("dealers/applications");
}

// ===== Admin 经销商审核（GET/PATCH /dealers/admin/applications，ADMIN） =====

/** 全部经销商申请（可按 status 过滤） */
export function listAdminApplications(
  status?: DealerApplicationStatus,
): Promise<DealerApplication[]> {
  const qs = status ? `?status=${status}` : "";
  return apiRequest<DealerApplication[]>(`dealers/admin/applications${qs}`);
}

export function approveApplication(
  id: number,
  reviewNote?: string,
): Promise<DealerApplication> {
  return apiRequest<DealerApplication>(
    `dealers/admin/applications/${id}/approve`,
    {
      method: "PATCH",
      body: JSON.stringify(reviewNote ? { reviewNote } : {}),
    },
  );
}

export function rejectApplication(
  id: number,
  reviewNote?: string,
): Promise<DealerApplication> {
  return apiRequest<DealerApplication>(
    `dealers/admin/applications/${id}/reject`,
    {
      method: "PATCH",
      body: JSON.stringify(reviewNote ? { reviewNote } : {}),
    },
  );
}

// ===== Dealer 企业与成员（DEALER，仅本企业成员可访问） =====

/**
 * 当前登录经销商的企业 ID。
 * 审批通过时后端会把 companyId 写回申请记录；无已批准申请返回 null
 * （如种子 dealer 账号尚未申请入驻）。
 */
export async function getMyCompanyId(): Promise<number | null> {
  const applications = await listMyApplications();
  const approved = applications.find(
    (app) => app.status === "APPROVED" && app.companyId != null,
  );
  return approved?.companyId ?? null;
}

/** 企业信息（GET /dealers/companies/:id） */
export function getCompany(companyId: number): Promise<DealerCompany> {
  return apiRequest<DealerCompany>(`dealers/companies/${companyId}`);
}

/** 企业成员列表（GET /dealers/companies/:id/members） */
export function listCompanyMembers(
  companyId: number,
): Promise<DealerMember[]> {
  return apiRequest<DealerMember[]>(
    `dealers/companies/${companyId}/members`,
  );
}

/**
 * 邀请成员（POST /dealers/companies/:id/members，OWNER/ADMIN）。
 * 后端错误：403 无权限 / 404 邮箱用户不存在 / 409 已是企业成员。
 */
export function addCompanyMember(
  companyId: number,
  email: string,
): Promise<DealerMember> {
  return apiRequest<DealerMember>(
    `dealers/companies/${companyId}/members`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}
