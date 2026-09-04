import { Transform } from "class-transformer";
import { IsEmail, IsString, Length } from "class-validator";

export class LoginDto {
  @IsEmail()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}
