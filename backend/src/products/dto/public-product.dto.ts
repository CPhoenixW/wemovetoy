export class PublicProductListItemDto {
  id!: number;
  name!: string;
  slug!: string;
  shortDescription!: string;
  price!: number;
  ageMin!: number | null;
  ageMax!: number | null;
  playEnvironment!: string | null;
  features!: string[];
  specifications!: Record<string, unknown>;
  category!: {
    id: number;
    name: string;
    slug: string;
  } | null;
  createdAt!: Date;
}

export class PublicProductVariantDto {
  id!: number;
  sku!: string;
  name!: string;
  options!: Record<string, unknown> | null;
  price!: number;
  isPurchasable!: boolean;
}

export class PublicProductDetailDto extends PublicProductListItemDto {
  description!: string;
  variants!: PublicProductVariantDto[];
}
