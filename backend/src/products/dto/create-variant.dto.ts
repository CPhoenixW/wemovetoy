import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsEnum,
  IsObject,
  Min,
} from "class-validator";
import { VariantStatus } from "@prisma/client";
import { Type } from "class-transformer";

export class CreateVariantDto {
  @IsNumber()
  productId!: number;

  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, string>;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dealerPrice?: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock?: number = 0;

  @IsOptional()
  @IsEnum(VariantStatus)
  status?: VariantStatus = VariantStatus.ACTIVE;
}
