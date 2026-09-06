import {
  Prisma,
  Product,
  Variant,
  Category,
  ProductStatus,
} from "@prisma/client";

// 对外暴露的安全商品类型（不包含内部敏感字段）
export interface SafeProduct {
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
  features: Prisma.JsonValue;
  specifications: Prisma.JsonValue;
  categoryId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// 包含分类和变体的完整商品详情
export interface SafeProductWithRelations extends SafeProduct {
  category: Pick<Category, "id" | "name" | "slug"> | null;
  variants: Pick<
    Variant,
    | "id"
    | "sku"
    | "name"
    | "options"
    | "price"
    | "dealerPrice"
    | "stock"
    | "status"
  >[];
}

export function toSafeProduct(product: Product): SafeProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    price: product.price.toNumber(),
    dealerPrice: product.dealerPrice?.toNumber() ?? null,
    ageMin: product.ageMin,
    ageMax: product.ageMax,
    playEnvironment: product.playEnvironment,
    status: product.status,
    features: product.features,
    specifications: product.specifications,
    categoryId: product.categoryId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

// 公开商品类型（不含 dealerPrice，供匿名用户使用）
export interface PublicSafeProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  ageMin: number | null;
  ageMax: number | null;
  playEnvironment: string | null;
  status: ProductStatus;
  features: Prisma.JsonValue;
  specifications: Prisma.JsonValue;
  categoryId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// 在 toSafeProduct 基础上增加过滤 dealerPrice 的函数
export function toPublicSafeProduct(product: Product): PublicSafeProduct {
  const safe = toSafeProduct(product);
  const { dealerPrice, ...publicProduct } = safe;
  void dealerPrice;
  return publicProduct;
}
