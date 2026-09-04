import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return isPublic || super.canActivate(context);
  }

  override handleRequest<TUser = unknown>(
    error: unknown,
    user: TUser | false,
    info: Error | undefined,
  ): TUser {
    if (error instanceof Error) {
      throw error;
    }

    if (!user) {
      throw new UnauthorizedException(info?.message || "Unauthorized");
    }

    return user;
  }
}
