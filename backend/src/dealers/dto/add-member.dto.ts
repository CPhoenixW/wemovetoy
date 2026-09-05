import { IsEmail } from "class-validator";

export class AddMemberDto {
  @IsEmail()
  email!: string;
}
