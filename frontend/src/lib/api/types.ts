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

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type ProductSort =
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "newest";

export interface Product {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  dealerPrice: number | null;
  ageMin: number | null;
  ageMax: number | null;
  playEnvironment: string | null;
  status: ProductStatus;
  features: string[] | null;
  specifications: Record<string, string | number> | null;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  name: string;
  options: Record<string, string> | null;
  price: number;
  dealerPrice: number | null;
  stock: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface ProductDetail extends Product {
  category: { id: number; name: string; slug: string } | null;
  variants: ProductVariant[];
}

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductListQuery {
  page?: number;
  limit?: number;
  sort?: ProductSort;
  categoryId?: number;
  status?: ProductStatus;
  search?: string;
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
