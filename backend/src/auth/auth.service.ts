import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { SafeUser } from "../users/safe-user";
import { UsersService } from "../users/users.service";

export interface LoginResult {
  accessToken: string;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterDto): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(input.password, this.saltRounds);
    return this.usersService.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });
  }

  async login(input: LoginDto): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(input.email);
    const passwordMatches =
      user && (await bcrypt.compare(input.password, user.passwordHash));
    if (!passwordMatches || !user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async me(userId: number): Promise<SafeUser> {
    const user = await this.usersService.findSafeById(userId);
    if (!user) {
      throw new UnauthorizedException("Account no longer exists");
    }
    return user;
  }
}
