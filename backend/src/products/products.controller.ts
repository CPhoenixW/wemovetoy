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
import {
  PublicProductListItemDto,
  PublicProductDetailDto,
} from "./dto/public-product.dto";

type PublicProductSource = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description?: string;
  price: number;
  ageMin: number | null;
  ageMax: number | null;
  playEnvironment: string | null;
  features?: unknown;
  specifications?: unknown;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  variants?: Array<{
    id: number;
    sku: string;
    name: string;
    options: Record<string, string> | null;
    price: number;
    stock: number;
  }>;
  createdAt: Date;
};

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
    const result = await this.productsService.findAll(query, true);
    return {
      ...result,
      items: result.items.map((item) => this.toPublicListItem(item)),
    };
  }

  // ============================================================
  // 公开接口：商品详情（通过 slug）
  // GET /api/v1/products/:slug
  // ============================================================
  @Public()
  @Get("products/:slug")
  async findBySlug(@Param("slug") slug: string) {
    const product = await this.productsService.findBySlug(slug);
    return this.toPublicDetail(product as unknown as PublicProductSource);
  }

  // ============================================================
  // DTO 转换方法（公开接口专用）
  // ============================================================
  private toPublicListItem(
    product: PublicProductSource,
  ): PublicProductListItemDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      price: product.price,
      ageMin: product.ageMin,
      ageMax: product.ageMax,
      playEnvironment: product.playEnvironment,
      category: product.category ?? null,
      createdAt: product.createdAt,
    };
  }

  private toPublicDetail(product: PublicProductSource): PublicProductDetailDto {
    // 安全提取 features
    let features: string[] = [];
    if (Array.isArray(product.features)) {
      features = product.features as string[];
    } else if (product.features && typeof product.features === "object") {
      // 如果是对象，尝试转换
      features = Object.values(product.features).filter(
        (v): v is string => typeof v === "string",
      );
    }

    // 安全提取 specifications
    let specifications: Record<string, unknown> = {};
    if (product.specifications && typeof product.specifications === "object") {
      specifications = product.specifications as Record<string, unknown>;
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description || "",
      price: product.price,
      ageMin: product.ageMin,
      ageMax: product.ageMax,
      playEnvironment: product.playEnvironment,
      features,
      specifications,
      category: product.category ?? null,
      variants: product.variants || [],
      createdAt: product.createdAt,
    };
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

  // ============================================================
  // Dealer 商品目录
  // GET /api/v1/dealer/products
  // ============================================================
  @Get("dealer/products")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DEALER)
  async getDealerProducts(@Query() query: QueryProductDto) {
    const result = await this.productsService.findAll(query, false);
    // 返回包含 dealerPrice 的版本，但不含 stock/reserved
    return result;
  }

  // ============================================================
  // Admin 商品管理
  // GET /api/v1/admin/products
  // ============================================================
  @Get("admin/products")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminProducts(@Query() query: QueryProductDto) {
    const result = await this.productsService.findAll(query, false);
    // 返回完整信息，包含所有字段
    return result;
  }
}
