import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, ProductStatus } from "@prisma/client";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { QueryProductDto } from "./dto/query-product.dto";
import {
  SafeProduct,
  SafeProductWithRelations,
  toSafeProduct,
} from "./safe-product";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 创建商品
  // ============================================================
  async create(input: CreateProductDto): Promise<SafeProduct> {
    // 检查 slug 是否已存在
    const existing = await this.prisma.product.findUnique({
      where: { slug: input.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Product with slug "${input.slug}" already exists`,
      );
    }

    const product = await this.prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        shortDescription: input.shortDescription,
        description: input.description,
        price: input.price,
        dealerPrice: input.dealerPrice,
        ageMin: input.ageMin,
        ageMax: input.ageMax,
        playEnvironment: input.playEnvironment,
        status: input.status ?? ProductStatus.DRAFT,
        features: input.features ?? [],
        specifications: input.specifications as Prisma.InputJsonValue,
        categoryId: input.categoryId,
      },
    });

    return toSafeProduct(product);
  }

  // ============================================================
  // 商品列表（分页、筛选、排序）
  // ============================================================
  async findAll(query: QueryProductDto): Promise<{
    items: SafeProduct[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, sort, categoryId, status, search } = query;

    // 构建 where 条件
    const where: Prisma.ProductWhereInput = {
      deletedAt: null, // 只查未删除的
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { shortDescription: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // 构建 orderBy
    let orderBy: Prisma.ProductOrderByWithRelationInput = {
      createdAt: "desc",
    };
    if (sort === "price_asc") {
      orderBy = { price: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { price: "desc" };
    } else if (sort === "name_asc") {
      orderBy = { name: "asc" };
    } else if (sort === "name_desc") {
      orderBy = { name: "desc" };
    } else if (sort === "newest") {
      orderBy = { createdAt: "desc" };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map(toSafeProduct),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================
  // 商品详情（含分类和变体）
  // ============================================================
  async findOne(id: number): Promise<SafeProductWithRelations> {
    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            options: true,
            price: true,
            dealerPrice: true,
            stock: true,
            status: true,
          },
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return {
      ...toSafeProduct(product),
      category: product.category,
      variants: product.variants,
    };
  }

  // ============================================================
  // 通过 slug 查商品（前台用）
  // ============================================================
  async findBySlug(slug: string): Promise<SafeProductWithRelations> {
    const product = await this.prisma.product.findUnique({
      where: { slug, deletedAt: null, status: "ACTIVE" },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            options: true,
            price: true,
            dealerPrice: true,
            stock: true,
            status: true,
          },
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }

    return {
      ...toSafeProduct(product),
      category: product.category,
      variants: product.variants,
    };
  }

  // ============================================================
  // 更新商品
  // ============================================================
  async update(id: number, input: UpdateProductDto): Promise<SafeProduct> {
    // 先检查商品是否存在
    const existing = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // 如果更新 slug，检查是否冲突
    if (input.slug && input.slug !== existing.slug) {
      const conflict = await this.prisma.product.findUnique({
        where: { slug: input.slug },
      });
      if (conflict) {
        throw new ConflictException(
          `Product with slug "${input.slug}" already exists`,
        );
      }
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        shortDescription: input.shortDescription,
        description: input.description,
        price: input.price,
        dealerPrice: input.dealerPrice,
        ageMin: input.ageMin,
        ageMax: input.ageMax,
        playEnvironment: input.playEnvironment,
        status: input.status,
        features: input.features,
        specifications: input.specifications as Prisma.InputJsonValue,
        categoryId: input.categoryId,
      },
    });

    return toSafeProduct(product);
  }

  // ============================================================
  // 软删除商品
  // ============================================================
  async remove(id: number): Promise<void> {
    const existing = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ============================================================
  // 发布商品（草稿 → 上架）
  // ============================================================
  async publish(id: number): Promise<SafeProduct> {
    const existing = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ACTIVE },
    });

    return toSafeProduct(product);
  }
}
