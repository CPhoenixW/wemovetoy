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
export type ProductStatus = "ACTIVE" | "ARCHIVED" | "DRAFT";

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
  playEnvironment?: string | null;
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

// ===== 公开商品（成员2 契约：GET /products，不暴露 dealerPrice/status/stock） =====
export type ProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc";

export interface Product {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  price: number;
  ageMin: number | null;
  ageMax: number | null;
  playEnvironment: string | null;
  features: string[];
  specifications: Record<string, unknown>;
  category: CategoryRef | null;
  createdAt: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  name: string;
  options: Record<string, unknown> | null;
  price: number;
  isPurchasable: boolean;
}

export interface ProductDetail extends Product {
  description: string;
  variants: ProductVariant[];
}

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductListQuery {
  page?: number;
  limit?: number;
  sort?: ProductSort;
  categoryId?: number;
  search?: string;
}

// ===== 购物车（成员3 契约，PR #10；服务端定价/库存） =====
export interface CartItem {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  availableStock: number;
  isPurchasable: boolean;
}

export interface Cart {
  id: number;
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  updatedAt: string;
}

// ===== 订单（成员3 契约，PR #10） =====
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderItem {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CreateOrderInput {
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  remark?: string;
}

/** Admin 订单列表项（GET /admin/orders） */
export interface AdminOrderListItem {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  customer: {
    id: number;
    email: string;
    name: string | null;
    role: string;
  };
  dealerCompany: null;
  createdAt: string;
}

export interface AdminOrderQuery {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  search?: string;
}

/** Admin 订单详情（GET /admin/orders/:id：订单快照 + 客户信息） */
export interface AdminOrderDetail extends Order {
  customer: {
    id: number;
    email: string;
    name: string | null;
    role: string;
  };
}
