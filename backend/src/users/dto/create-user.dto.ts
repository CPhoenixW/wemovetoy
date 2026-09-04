import { UserRole } from "@prisma/client";

export interface CreateUserDto {
  email: string;
  passwordHash: string;
  name?: string;
  role?: UserRole;
}
