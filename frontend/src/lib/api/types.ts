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

// ===== 商品 =====

export type ProductStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

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
  features: unknown;
  specifications: unknown;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: number;
  sku: string;
  name: string | null;
  options: unknown;
  price: number | string;
  dealerPrice: number | string | null;
  stock: number;
  status: string;
}

export interface ProductWithRelations extends Product {
  category: { id: number; name: string; slug: string } | null;
  variants: ProductVariant[];
}

export interface ProductQuery {
  page?: number;
  limit?: number;
  sort?: string;
  categoryId?: number;
  status?: ProductStatus;
  search?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductInput {
  name?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  price?: number;
  dealerPrice?: number | null;
  ageMin?: number;
  ageMax?: number;
  playEnvironment?: string;
  status?: ProductStatus;
  features?: string[];
  specifications?: Record<string, unknown>;
  categoryId?: number;
}

// ===== 购物车 =====

export interface CartItem {
  id: number;
  cartId: number;
  variantId: number;
  quantity: number;
  unitPrice: number | string;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

// ===== 订单 =====

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

export interface OrderItem {
  id: number;
  orderId: number;
  variantId: number;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number | string;
  subtotal: number | string;
}

export interface Order {
  id: number;
  userId: number;
  orderNumber: string;
  totalAmount: number | string;
  status: OrderStatus;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface CreateOrderInput {
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  remark?: string;
}

// ===== 经销商申请 =====

export type DealerApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DealerApplication {
  id: number;
  userId: number;
  companyName: string;
  contactName: string;
  contactPhone: string;
  address: string;
  taxId: string;
  status: DealerApplicationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}
