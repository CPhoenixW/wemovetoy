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
import { PublicQueryProductDto } from "./dto/public-query-product.dto";
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
  PublicProductVariantDto,
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
    options: unknown;
    price: { toNumber(): number };
    stock: number;
    reserved: number;
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
  async findAll(@Query() query: PublicQueryProductDto) {
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
    return this.toPublicDetail(product);
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
      features: this.toPublicFeatures(product.features),
      specifications: this.toPublicSpecifications(product.specifications),
      category: product.category ?? null,
      createdAt: product.createdAt,
    };
  }

  private toPublicDetail(product: PublicProductSource): PublicProductDetailDto {
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
      features: this.toPublicFeatures(product.features),
      specifications: this.toPublicSpecifications(product.specifications),
      variants: (product.variants ?? []).map((variant) =>
        this.toPublicVariant(variant),
      ),
      category: product.category ?? null,
      createdAt: product.createdAt,
    };
  }

  private toPublicVariant(
    variant: NonNullable<PublicProductSource["variants"]>[number],
  ): PublicProductVariantDto {
    const options =
      variant.options &&
      typeof variant.options === "object" &&
      !Array.isArray(variant.options)
        ? (variant.options as Record<string, unknown>)
        : null;

    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options,
      price: variant.price.toNumber(),
      isPurchasable: variant.stock - variant.reserved > 0,
    };
  }

  private toPublicFeatures(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (value && typeof value === "object") {
      return Object.values(value).filter(
        (item): item is string => typeof item === "string",
      );
    }
    return [];
  }

  private toPublicSpecifications(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
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
  async getDealerProducts(@Query() query: PublicQueryProductDto) {
    return this.productsService.findDealerProducts(query);
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
