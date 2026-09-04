import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";

@Public()
@Controller("health")
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: "ok" };
  }
}
