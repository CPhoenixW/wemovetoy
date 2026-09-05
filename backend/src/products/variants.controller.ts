import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { VariantsService } from "./variants.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    role: UserRole;
  };
}

@Controller("api/v1")
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Get("variants/:sku")
  @UseGuards(JwtAuthGuard)
  async getVariantBySku(
    @Param("sku") sku: string,
    @Request() req: RequestWithUser,
  ) {
    const isDealer =
      req.user.role === UserRole.DEALER || req.user.role === UserRole.ADMIN;
    return this.variantsService.getVariantBySku(sku, isDealer);
  }

  @Post("variants/batch")
  @UseGuards(JwtAuthGuard)
  async getVariantsBySkus(
    @Body() body: { skus: string[] },
    @Request() req: RequestWithUser,
  ) {
    const isDealer =
      req.user.role === UserRole.DEALER || req.user.role === UserRole.ADMIN;
    const result = await this.variantsService.getVariantsBySkus(
      body.skus,
      isDealer,
    );
    return {
      items: Array.from(result.values()),
    };
  }

  @Post("variants/check-stock")
  @UseGuards(JwtAuthGuard)
  async checkStock(@Body() body: { sku: string; quantity: number }) {
    return this.variantsService.checkStock(body.sku, body.quantity);
  }
}
