import { VariantStatus } from "@prisma/client";

export class VariantResponseDto {
  id!: number;
  sku!: string;
  name!: string;
  options!: Record<string, string> | null;
  price!: number;
  dealerPrice!: number | null;
  stock!: number;
  reserved!: number;
  availableStock!: number;
  status!: VariantStatus;
  isPurchasable!: boolean;
}
