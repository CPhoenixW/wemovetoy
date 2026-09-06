export class DealerProductListItemDto {
  id!: number;
  name!: string;
  slug!: string;
  shortDescription!: string;
  price!: number; // 零售价
  dealerPrice!: number; // Dealer 价
  ageMin!: number | null;
  ageMax!: number | null;
  playEnvironment!: string | null;
  category!: {
    id: number;
    name: string;
    slug: string;
  } | null;
}
