import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsObject, Min, Max } from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  shortDescription: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dealerPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ageMin?: number;

  @IsOptional()
  @IsNumber()
  @Max(120)
  @Type(() => Number)
  ageMax?: number;

  @IsOptional()
  @IsString()
  playEnvironment?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  categoryId?: number;
}