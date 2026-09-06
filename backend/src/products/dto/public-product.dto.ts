export class PublicProductListItemDto {
  id!: number;
  name!: string;
  slug!: string;
  shortDescription!: string;
  price!: number;
  ageMin!: number | null;
  ageMax!: number | null;
  playEnvironment!: string | null;
  category!: {
    id: number;
    name: string;
    slug: string;
  } | null;
  createdAt!: Date;
}

export class PublicProductDetailDto extends PublicProductListItemDto {
  description!: string;
  features!: string[];
  specifications!: Record<string, unknown>;
}
