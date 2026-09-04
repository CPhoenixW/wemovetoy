import { UnauthorizedException } from "@nestjs/common";
import { User, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";

const password = "ChangeMe123!";
const user: User = {
  id: 1,
  email: "user@wemove.local",
  name: "Demo User",
  passwordHash: "",
  role: UserRole.USER,
  createdAt: new Date("2026-09-04T00:00:00.000Z"),
  updatedAt: new Date("2026-09-04T00:00:00.000Z"),
};

describe("AuthService", () => {
  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findSafeById: jest.fn(),
  } as unknown as UsersService;
  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as JwtService;
  const service = new AuthService(usersService, jwtService);

  beforeEach(async () => {
    jest.resetAllMocks();
    user.passwordHash = await bcrypt.hash(password, 4);
  });

  it("returns a token and never exposes the password hash after successful login", async () => {
    jest.spyOn(usersService, "findByEmail").mockResolvedValue(user);
    jest.spyOn(jwtService, "signAsync").mockResolvedValue("access-token");

    await expect(
      service.login({ email: user.email, password }),
    ).resolves.toEqual({
      accessToken: "access-token",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: UserRole.USER,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  });

  it("rejects invalid credentials without indicating whether the email exists", async () => {
    jest.spyOn(usersService, "findByEmail").mockResolvedValue(null);

    await expect(
      service.login({ email: user.email, password }),
    ).rejects.toEqual(new UnauthorizedException("Invalid email or password"));
  });
});
