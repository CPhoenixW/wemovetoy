import { apiRequest } from "./client";
import type {
  CreateDealerApplicationInput,
  DealerApplication,
  DealerApplicationStatus,
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
