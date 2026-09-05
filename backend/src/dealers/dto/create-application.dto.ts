import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateApplicationDto {
  @IsString()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  companyName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  taxId?: string;
}
