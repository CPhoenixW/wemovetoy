import { ConflictException, Injectable } from "@nestjs/common";
import { User, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { SafeUser, toSafeUser } from "./safe-user";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findSafeById(id: number): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toSafeUser(user) : null;
  }

  async create(input: CreateUserDto): Promise<SafeUser> {
    const existingUser = await this.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        role: input.role ?? UserRole.USER,
      },
    });

    return toSafeUser(user);
  }
}
