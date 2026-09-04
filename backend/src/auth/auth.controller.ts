import { Body, Controller, Get, Post, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { AuthService, LoginResult } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { SafeUser } from "../users/safe-user";

interface AuthenticatedRequest {
  user: JwtPayload;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({ summary: "Register a consumer account" })
  register(@Body() input: RegisterDto): Promise<SafeUser> {
    return this.authService.register(input);
  }

  @Public()
  @Post("login")
  @ApiOperation({ summary: "Sign in and receive an access token" })
  login(@Body() input: LoginDto): Promise<LoginResult> {
    return this.authService.login(input);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the authenticated account" })
  me(@Request() request: AuthenticatedRequest): Promise<SafeUser> {
    return this.authService.me(request.user.sub);
  }
}
