import { apiRequest } from "./client";
import type { CreateDealerApplicationInput, DealerApplication } from "./types";

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
