import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, VariantStatus } from "@prisma/client";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { UpdateVariantDto } from "./dto/update-variant.dto";
import { VariantResponseDto } from "./dto/variant-response.dto";

export type PriceAudience = "RETAIL" | "DEALER";

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据 SKU 查询变体信息（供 Controller 使用）
   */
  async getVariantBySku(
    sku: string,
    isDealer: boolean = false,
  ): Promise<VariantResponseDto> {
    const variant = await this.prisma.variant.findUnique({
      where: { sku },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            status: true,
            deletedAt: true,
            price: true,
            dealerPrice: true,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with SKU "${sku}" not found`);
    }

    const isProductActive =
      variant.product.status === "ACTIVE" && variant.product.deletedAt === null;
    const isVariantActive = variant.status === VariantStatus.ACTIVE;
    const availableStock = variant.stock - variant.reserved;
    const isPurchasable =
      isProductActive && isVariantActive && availableStock > 0;

    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options: variant.options as Record<string, string> | null,
      price:
        isDealer && variant.dealerPrice
          ? Number(variant.dealerPrice)
          : Number(variant.price),
      dealerPrice: variant.dealerPrice ? Number(variant.dealerPrice) : null,
      stock: variant.stock,
      reserved: variant.reserved,
      availableStock,
      status: variant.status,
      isPurchasable,
    };
  }

  /**
   * 批量查询变体（用于购物车批量查询）
   */
  async getVariantsBySkus(
    skus: string[],
    isDealer: boolean = false,
  ): Promise<Map<string, VariantResponseDto>> {
    const variants = await this.prisma.variant.findMany({
      where: { sku: { in: skus } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            status: true,
            deletedAt: true,
            price: true,
            dealerPrice: true,
          },
        },
      },
    });

    const result = new Map<string, VariantResponseDto>();
    for (const variant of variants) {
      const dto = this.buildVariantResponse(variant, isDealer);
      result.set(variant.sku, dto);
    }
    return result;
  }

  /**
   * 【内部使用】校验库存是否充足（供订单模块调用）
   * @deprecated 推荐使用 getPurchasableVariant 替代
   */
  async checkStock(
    sku: string,
    quantity: number,
  ): Promise<{
    available: boolean;
    availableStock: number;
    reason?: string;
  }> {
    const variant = await this.prisma.variant.findUnique({
      where: { sku },
      include: {
        product: {
          select: { status: true, deletedAt: true },
        },
      },
    });

    if (!variant) {
      return { available: false, availableStock: 0, reason: "SKU not found" };
    }

    const availableStock = variant.stock - variant.reserved;
    const isProductActive =
      variant.product.status === "ACTIVE" && variant.product.deletedAt === null;
    const isVariantActive = variant.status === VariantStatus.ACTIVE;

    if (!isProductActive) {
      return {
        available: false,
        availableStock,
        reason: "Product is not available",
      };
    }
    if (!isVariantActive) {
      return {
        available: false,
        availableStock,
        reason: "Variant is not active",
      };
    }
    if (availableStock < quantity) {
      return { available: false, availableStock, reason: "Insufficient stock" };
    }

    return { available: true, availableStock };
  }

  /**
   * 创建变体（Admin 专用）
   */
  async createVariant(input: CreateVariantDto): Promise<VariantResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with id ${input.productId} not found`,
      );
    }

    const existing = await this.prisma.variant.findUnique({
      where: { sku: input.sku },
    });
    if (existing) {
      throw new ConflictException(
        `Variant with SKU "${input.sku}" already exists`,
      );
    }

    const variant = await this.prisma.variant.create({
      data: {
        sku: input.sku,
        name: input.name,
        options: input.options as Prisma.InputJsonValue,
        price: input.price,
        dealerPrice: input.dealerPrice,
        stock: input.stock ?? 0,
        reserved: 0,
        status: input.status ?? VariantStatus.ACTIVE,
        productId: input.productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            status: true,
            deletedAt: true,
            price: true,
            dealerPrice: true,
          },
        },
      },
    });

    return this.buildVariantResponse(variant, false);
  }

  /**
   * 更新变体（Admin 专用）
   */
  async updateVariant(
    id: number,
    input: UpdateVariantDto,
  ): Promise<VariantResponseDto> {
    const existing = await this.prisma.variant.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Variant with id ${id} not found`);
    }

    if (input.sku && input.sku !== existing.sku) {
      const conflict = await this.prisma.variant.findUnique({
        where: { sku: input.sku },
      });
      if (conflict) {
        throw new ConflictException(
          `Variant with SKU "${input.sku}" already exists`,
        );
      }
    }

    const variant = await this.prisma.variant.update({
      where: { id },
      data: {
        sku: input.sku,
        name: input.name,
        options: input.options as Prisma.InputJsonValue,
        price: input.price,
        dealerPrice: input.dealerPrice,
        stock: input.stock,
        status: input.status,
        productId: input.productId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            status: true,
            deletedAt: true,
            price: true,
            dealerPrice: true,
          },
        },
      },
    });

    return this.buildVariantResponse(variant, false);
  }

  /**
   * 删除变体（Admin 专用）
   */
  async deleteVariant(id: number): Promise<void> {
    const existing = await this.prisma.variant.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Variant with id ${id} not found`);
    }

    await this.prisma.variant.delete({
      where: { id },
    });
  }

  /**
   * 【核心方法】供购物车和订单模块调用的交易接口
   * 返回符合契约的 PurchasableVariant 对象，unitPrice 为 Prisma.Decimal
   * 不可售时返回 isPurchasable: false 和具体原因，不抛出异常
   */
  async getPurchasableVariant(
    variantId: number,
    audience: PriceAudience,
  ): Promise<{
    variantId: number;
    sku: string;
    productName: string;
    variantName: string;
    unitPrice: Prisma.Decimal;
    availableStock: number;
    isPurchasable: boolean;
    reason?: string;
  }> {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!variant) {
      return {
        variantId,
        sku: "",
        productName: "",
        variantName: "",
        unitPrice: new Prisma.Decimal(0),
        availableStock: 0,
        isPurchasable: false,
        reason: "SKU not found",
      };
    }

    const isProductActive =
      variant.product.status === "ACTIVE" && variant.product.deletedAt === null;
    const isVariantActive = variant.status === VariantStatus.ACTIVE;
    const availableStock = variant.stock - variant.reserved;

    if (!isProductActive) {
      return {
        variantId: variant.id,
        sku: variant.sku,
        productName: variant.product.name,
        variantName: variant.name,
        unitPrice: new Prisma.Decimal(0),
        availableStock,
        isPurchasable: false,
        reason: "Product is not active",
      };
    }

    if (!isVariantActive) {
      return {
        variantId: variant.id,
        sku: variant.sku,
        productName: variant.product.name,
        variantName: variant.name,
        unitPrice: new Prisma.Decimal(0),
        availableStock,
        isPurchasable: false,
        reason: "Variant is not active",
      };
    }

    if (availableStock <= 0) {
      return {
        variantId: variant.id,
        sku: variant.sku,
        productName: variant.product.name,
        variantName: variant.name,
        unitPrice: new Prisma.Decimal(0),
        availableStock,
        isPurchasable: false,
        reason: "Insufficient stock",
      };
    }

    const unitPrice =
      audience === "DEALER" && variant.dealerPrice
        ? new Prisma.Decimal(variant.dealerPrice.toString())
        : new Prisma.Decimal(variant.price.toString());

    return {
      variantId: variant.id,
      sku: variant.sku,
      productName: variant.product.name,
      variantName: variant.name,
      unitPrice,
      availableStock,
      isPurchasable: true,
    };
  }

  private buildVariantResponse(
    variant: Prisma.VariantGetPayload<{
      include: {
        product: {
          select: {
            id: true;
            name: true;
            status: true;
            deletedAt: true;
            price: true;
            dealerPrice: true;
          };
        };
      };
    }>,
    isDealer: boolean,
  ): VariantResponseDto {
    const isProductActive =
      variant.product.status === "ACTIVE" && variant.product.deletedAt === null;
    const isVariantActive = variant.status === VariantStatus.ACTIVE;
    const availableStock = variant.stock - variant.reserved;
    const isPurchasable =
      isProductActive && isVariantActive && availableStock > 0;

    const price =
      isDealer && variant.dealerPrice
        ? Number(variant.dealerPrice)
        : Number(variant.price);

    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options: variant.options as Record<string, string> | null,
      price,
      dealerPrice: variant.dealerPrice ? Number(variant.dealerPrice) : null,
      stock: variant.stock,
      reserved: variant.reserved,
      availableStock,
      status: variant.status,
      isPurchasable,
    };
  }
}
