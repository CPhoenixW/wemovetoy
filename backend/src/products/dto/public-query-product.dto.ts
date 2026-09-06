import { Type } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

const productSorts = [
  "newest",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
] as const;

export class PublicQueryProductDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsIn(productSorts)
  sort?: (typeof productSorts)[number];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
