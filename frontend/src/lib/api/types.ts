export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
  request_id: string;
}

export interface ApiFailure {
  success: false;
  message: string | string[];
  request_id: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string | null;
  role: "USER" | "DEALER" | "ADMIN";
  createdAt: string;
  updatedAt: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

export type DealerApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DealerApplication {
  id: number;
  userId: number;
  companyName: string;
  contactName: string | null;
  contactPhone: string | null;
  address: string | null;
  taxId: string | null;
  status: DealerApplicationStatus;
  reviewNote: string | null;
  reviewedById: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  companyId: number | null;
}

export interface CreateDealerApplicationInput {
  companyName: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
  taxId?: string;
}
