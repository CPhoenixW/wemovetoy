import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.trim() : value,
  )
  name?: string;
}
