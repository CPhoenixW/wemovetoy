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

@Controller("variants")
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  // ============================================================
  // 公开 SKU 查询：普通用户只能看到价格（不含 dealerPrice）、是否可购买
  // GET /api/v1/variants/:sku
  // ============================================================
  // 单件查询：需 JWT，按角色返回对应价格（普通用户看不到 dealerPrice）
  @Get(":sku")
  @UseGuards(JwtAuthGuard)
  async getVariantBySku(
    @Param("sku") sku: string,
    @Request() req: RequestWithUser,
  ) {
    const isDealer =
      req.user.role === UserRole.DEALER || req.user.role === UserRole.ADMIN;
    const variant = await this.variantsService.getVariantBySku(sku, isDealer);
    // 返回最小响应（不含 stock/reserved）
    return {
      sku: variant.sku,
      name: variant.name,
      price: variant.price,
      isPurchasable: variant.isPurchasable,
    };
  }

  // ============================================================
  // 经销商/管理员查询：返回完整信息（含 dealerPrice、库存等）
  // GET /api/v1/variants/dealer/:sku
  // ============================================================
  @Get("dealer/:sku")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER, UserRole.ADMIN)
  async getDealerVariant(@Param("sku") sku: string) {
    return this.variantsService.getVariantBySku(sku, true);
  }

  // ============================================================
  // 批量查询 SKU（登录用户）
  // POST /api/v1/variants/batch
  // ============================================================
  @Post("batch")
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

  // ============================================================
  // 后台管理接口：创建变体（仅管理员）
  // POST /api/v1/variants/admin
  // ============================================================
  @Post("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createVariant(@Body() input: CreateVariantDto) {
    return this.variantsService.createVariant(input);
  }

  // ============================================================
  // 后台管理接口：更新变体（仅管理员）
  // PATCH /api/v1/variants/admin/:id
  // ============================================================
  @Patch("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateVariant(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UpdateVariantDto,
  ) {
    return this.variantsService.updateVariant(id, input);
  }

  // ============================================================
  // 后台管理接口：删除变体（仅管理员）
  // DELETE /api/v1/variants/admin/:id
  // ============================================================
  @Delete("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteVariant(@Param("id", ParseIntPipe) id: number) {
    await this.variantsService.deleteVariant(id);
    return { message: "Variant deleted successfully" };
  }
}
