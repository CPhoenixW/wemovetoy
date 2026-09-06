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
import { QueryVariantsDto } from "./dto/variant-lookup.dto";

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

  @Get(":sku")
  @UseGuards(JwtAuthGuard)
  async getVariantBySku(
    @Param("sku") sku: string,
    @Request() req: RequestWithUser,
  ) {
    return this.variantsService.getVariantBySku(
      sku,
      req.user.role === UserRole.DEALER ? "DEALER" : "RETAIL",
    );
  }

  @Post("batch")
  @UseGuards(JwtAuthGuard)
  async getVariantsBySkus(
    @Body() body: QueryVariantsDto,
    @Request() req: RequestWithUser,
  ) {
    const items = await this.variantsService.getVariantsBySkus(
      body.skus,
      req.user.role === UserRole.DEALER ? "DEALER" : "RETAIL",
    );
    return { items };
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
