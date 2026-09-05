import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductDto } from "./dto/query-product.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { UserRole } from "@prisma/client";

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ============================================================
  // 公开接口：商品列表（所有人可访问）
  // GET /api/v1/products
  // ============================================================
  @Public()
  @Get("products")
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  // ============================================================
  // 公开接口：商品详情（通过 slug）
  // GET /api/v1/products/:slug
  // ============================================================
  @Public()
  @Get("products/:slug")
  async findBySlug(@Param("slug") slug: string) {
    return this.productsService.findBySlug(slug);
  }

  // ============================================================
  // 后台接口：获取单个商品（通过 id，管理员专用）
  // GET /api/v1/admin/products/:id
  // ============================================================
  @Get("admin/products/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // ============================================================
  // 后台接口：创建商品（管理员专用）
  // POST /api/v1/admin/products
  // ============================================================
  @Post("admin/products")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() input: CreateProductDto) {
    return this.productsService.create(input);
  }

  // ============================================================
  // 后台接口：更新商品（管理员专用）
  // PATCH /api/v1/admin/products/:id
  // ============================================================
  @Patch("admin/products/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() input: UpdateProductDto,
  ) {
    return this.productsService.update(id, input);
  }

  // ============================================================
  // 后台接口：删除商品（管理员专用）
  // DELETE /api/v1/admin/products/:id
  // ============================================================
  @Delete("admin/products/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.productsService.remove(id);
    return { message: "Product deleted successfully" };
  }

  // ============================================================
  // 后台接口：发布商品（管理员专用）
  // POST /api/v1/admin/products/:id/publish
  // ============================================================
  @Post("admin/products/:id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async publish(@Param("id", ParseIntPipe) id: number) {
    return this.productsService.publish(id);
  }
}
