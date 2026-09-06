import { apiRequest } from "./client";
import type { DealerApplication, DealerApplicationStatus } from "./types";

/** ADMIN：经销商申请列表，可按状态过滤 */
export function getAdminApplications(
  status?: DealerApplicationStatus,
): Promise<DealerApplication[]> {
  return apiRequest(
    `dealers/admin/applications${status ? `?status=${status}` : ""}`,
  );
}

export function approveApplication(
  id: number,
  reviewNote?: string,
): Promise<DealerApplication> {
  return apiRequest(`dealers/admin/applications/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ reviewNote }),
  });
}

export function rejectApplication(
  id: number,
  reviewNote?: string,
): Promise<DealerApplication> {
  return apiRequest(`dealers/admin/applications/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reviewNote }),
  });
}
