export class DealerProductVariantDto {
  id!: number;
  sku!: string;
  name!: string;
  unitPrice!: number;
  availableStock!: number;
  isPurchasable!: boolean;
}

export class DealerProductListItemDto {
  id!: number;
  name!: string;
  slug!: string;
  shortDescription!: string;
  retailPrice!: number;
  dealerPrice!: number;
  ageMin!: number | null;
  ageMax!: number | null;
  playEnvironment!: string | null;
  category!: {
    id: number;
    name: string;
    slug: string;
  } | null;
  variants!: DealerProductVariantDto[];
}
