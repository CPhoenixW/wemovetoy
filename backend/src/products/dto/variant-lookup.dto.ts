import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsString,
} from "class-validator";

export class QueryVariantsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  skus!: string[];
}

export class AuthenticatedVariantDto {
  id!: number;
  sku!: string;
  productId!: number;
  productName!: string;
  name!: string;
  options!: Record<string, unknown> | null;
  unitPrice!: number;
  isPurchasable!: boolean;
  availableStock?: number;
}
