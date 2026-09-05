import { Product, Variant, Category, ProductStatus } from "@prisma/client";

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
  features: string[] | null;
  specifications: Record<string, unknown> | null;
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
