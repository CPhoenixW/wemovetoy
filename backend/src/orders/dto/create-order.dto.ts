import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  shippingPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
