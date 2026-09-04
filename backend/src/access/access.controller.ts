import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("access checks")
@ApiBearerAuth()
@Controller()
export class AccessController {
  @Get("admin/ping")
  @Roles("ADMIN")
  adminPing(): { status: string } {
    return { status: "ok" };
  }

  @Get("dealer/ping")
  @Roles("DEALER")
  dealerPing(): { status: string } {
    return { status: "ok" };
  }
}
