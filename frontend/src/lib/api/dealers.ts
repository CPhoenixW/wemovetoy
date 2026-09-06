import { apiRequest } from "./client";
import type {
  CreateDealerApplicationInput,
  DealerApplication,
} from "./types";

export function createDealerApplication(
  accessToken: string,
  input: CreateDealerApplicationInput,
): Promise<DealerApplication> {
  return apiRequest<DealerApplication>("dealers/applications", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(input),
  });
}

export function listMyApplications(
  accessToken: string,
): Promise<DealerApplication[]> {
  return apiRequest<DealerApplication[]>("dealers/applications", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
