import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryProductDto {
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
  @IsString()
  sort?: string; // 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest'

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  search?: string;
}