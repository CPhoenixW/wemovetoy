import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Delete,
  ParseIntPipe,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { VariantsService } from "./variants.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { UpdateVariantDto } from "./dto/update-variant.dto";

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

  // ===== 公开/登录用户均可访问的 SKU 查询（合并路由） =====
  @Get("products/skus/:sku")
  async getVariantBySku(
    @Param("sku") sku: string,
    @Request() req: RequestWithUser,
  ) {
    // 判断是否登录且有经销商/管理员角色
    const isDealer =
      req.user?.role === UserRole.DEALER || req.user?.role === UserRole.ADMIN;
    return this.variantsService.getVariantBySku(sku, isDealer);
  }

  // ===== 登录用户专用接口 =====
  @Post("products/skus/batch")
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
    return { items: Array.from(result.values()) };
  }

  @Post("products/skus/check-stock")
  @UseGuards(JwtAuthGuard)
  async checkStock(@Body() body: { sku: string; quantity: number }) {
    return this.variantsService.checkStock(body.sku, body.quantity);
  }

  // ===== 后台管理接口（仅管理员） =====
  @Post("admin/variants")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createVariant(@Body() input: CreateVariantDto) {
    return this.variantsService.createVariant(input);
  }

  @Patch("admin/variants/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateVariant(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UpdateVariantDto,
  ) {
    return this.variantsService.updateVariant(id, input);
  }

  @Delete("admin/variants/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteVariant(@Param("id", ParseIntPipe) id: number) {
    await this.variantsService.deleteVariant(id);
    return { message: "Variant deleted successfully" };
  }
}
