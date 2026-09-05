import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
