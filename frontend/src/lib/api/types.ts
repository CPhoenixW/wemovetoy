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

// ===== 分页（契约统一形态） =====
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===== 商品（成员2 契约，PR #5） =====
export type ProductStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

/** Admin 商品列表项（GET /admin/products，SafeProduct + category） */
export interface AdminProduct {
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
  features: unknown;
  specifications: unknown;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
  category: CategoryRef | null;
}

/** Admin 商品详情（GET /admin/products/:id，含 variants；Decimal 可能序列化为字符串） */
export interface AdminProductVariant {
  id: number;
  sku: string;
  name: string;
  options: Record<string, unknown> | null;
  price: number | string;
  dealerPrice: number | string | null;
  stock: number;
  reserved: number;
  status: string;
}

export interface AdminProductDetail extends AdminProduct {
  variants: AdminProductVariant[];
}

/** 商品新建/编辑入参（POST/PATCH /admin/products） */
export interface ProductInput {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  dealerPrice?: number | null;
  ageMin?: number | null;
  ageMax?: number | null;
  playEnvironment?: string;
  status?: ProductStatus;
  features?: string[];
  specifications?: Record<string, unknown>;
  categoryId?: number | null;
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  sort?: string;
  categoryId?: number;
  status?: ProductStatus;
  search?: string;
}

/** Dealer 商品目录项（GET /dealer/products，内联可售 variants） */
export interface DealerVariant {
  id: number;
  sku: string;
  name: string;
  unitPrice: number;
  availableStock: number;
  isPurchasable: boolean;
}

export interface DealerProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  retailPrice: number;
  dealerPrice: number;
  ageMin: number | null;
  ageMax: number | null;
  playEnvironment: string | null;
  category: CategoryRef | null;
  variants: DealerVariant[];
}
