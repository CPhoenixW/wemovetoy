import { ForbiddenException } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common/interfaces/features/execution-context.interface";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  const contextFor = (role?: "USER" | "DEALER" | "ADMIN"): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => jest.resetAllMocks());

  it("allows the required role", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["DEALER"]);

    expect(guard.canActivate(contextFor("DEALER"))).toBe(true);
  });

  it("rejects a signed-in account with a different role", () => {
    jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["ADMIN"]);

    expect(() => guard.canActivate(contextFor("USER"))).toThrow(
      ForbiddenException,
    );
  });
});
