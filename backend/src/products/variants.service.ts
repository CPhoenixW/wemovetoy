import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, VariantStatus } from "@prisma/client";
import { CreateVariantDto } from "./dto/create-variant.dto";
import { UpdateVariantDto } from "./dto/update-variant.dto";
import { VariantResponseDto } from "./dto/variant-response.dto";
import { AuthenticatedVariantDto } from "./dto/variant-lookup.dto";

export type PriceAudience = "RETAIL" | "DEALER";

export interface PurchasableVariant {
  variantId: number;
  sku: string;
  productId: number;
  productName: string;
  variantName: string;
  unitPrice: Prisma.Decimal;
  availableStock: number;
  isPurchasable: boolean;
}

type VariantWithProduct = Prisma.VariantGetPayload<{
  include: {
    product: {
      select: {
        id: true;
        name: true;
        status: true;
        deletedAt: true;
      };
    };
  };
}>;

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getVariantBySku(
    sku: string,
    audience: PriceAudience,
  ): Promise<AuthenticatedVariantDto> {
    const variant = await this.findVariantBySku(sku);
    return this.toAuthenticatedVariant(variant, audience);
  }

  async getVariantsBySkus(
    skus: string[],
    audience: PriceAudience,
  ): Promise<AuthenticatedVariantDto[]> {
    if (
      skus.length === 0 ||
      skus.length > 100 ||
      new Set(skus).size !== skus.length
    ) {
      throw new BadRequestException("SKUs must contain 1 to 100 unique values");
    }

    const variants = await this.prisma.variant.findMany({
      where: { sku: { in: skus } },
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

    const variantsBySku = new Map(
      variants.map((variant) => [variant.sku, variant]),
    );
    const result: AuthenticatedVariantDto[] = [];
    for (const sku of skus) {
      const variant = variantsBySku.get(sku);
      if (!variant) {
        throw new NotFoundException(`Variant with SKU "${sku}" not found`);
      }
      result.push(this.toAuthenticatedVariant(variant, audience));
    }

    return result;
  }

  async getPurchasableVariant(
    variantId: number,
    audience: PriceAudience,
  ): Promise<PurchasableVariant> {
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
      throw new NotFoundException(`Variant with id ${variantId} not found`);
    }

    return this.toPurchasableVariant(variant, audience);
  }

  private async findVariantBySku(sku: string): Promise<VariantWithProduct> {
    const variant = await this.prisma.variant.findUnique({
      where: { sku },
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
      throw new NotFoundException(`Variant with SKU "${sku}" not found`);
    }
    return variant;
  }

  private toAuthenticatedVariant(
    variant: VariantWithProduct,
    audience: PriceAudience,
  ): AuthenticatedVariantDto {
    const purchasable = this.toPurchasableVariant(variant, audience);
    const result: AuthenticatedVariantDto = {
      id: purchasable.variantId,
      sku: purchasable.sku,
      productId: purchasable.productId,
      productName: purchasable.productName,
      name: purchasable.variantName,
      options: this.toOptions(variant.options),
      unitPrice: purchasable.unitPrice.toNumber(),
      isPurchasable: purchasable.isPurchasable,
    };
    if (audience === "DEALER") {
      result.availableStock = purchasable.availableStock;
    }
    return result;
  }

  private toPurchasableVariant(
    variant: VariantWithProduct,
    audience: PriceAudience,
  ): PurchasableVariant {
    const availableStock = Math.max(0, variant.stock - variant.reserved);
    const isProductActive =
      variant.product.status === "ACTIVE" && variant.product.deletedAt === null;
    if (
      !isProductActive ||
      variant.status !== VariantStatus.ACTIVE ||
      availableStock === 0
    ) {
      throw new BadRequestException("Variant is not available for purchase");
    }

    return {
      variantId: variant.id,
      sku: variant.sku,
      productId: variant.product.id,
      productName: variant.product.name,
      variantName: variant.name,
      unitPrice:
        audience === "DEALER" && variant.dealerPrice
          ? variant.dealerPrice
          : variant.price,
      availableStock,
      isPurchasable: true,
    };
  }

  private toOptions(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  /**
   * Admin 维护接口需要完整 SKU 数据；对外用户查询不得调用此映射。
   */
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
    const availableStock = Math.max(0, variant.stock - variant.reserved);
    const isPurchasable =
      isProductActive && isVariantActive && availableStock > 0;

    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options: this.toOptions(variant.options),
      price:
        isDealer && variant.dealerPrice
          ? variant.dealerPrice.toNumber()
          : variant.price.toNumber(),
      dealerPrice: variant.dealerPrice?.toNumber() ?? null,
      stock: variant.stock,
      reserved: variant.reserved,
      availableStock,
      status: variant.status,
      isPurchasable,
    };
  }

  /**
   * Internal-only compatibility helper. HTTP controllers must not expose it.
   */
  async checkStock(
    sku: string,
    quantity: number,
  ): Promise<{ available: boolean; availableStock: number; reason?: string }> {
    try {
      const variant = await this.findVariantBySku(sku);
      const availableStock = Math.max(0, variant.stock - variant.reserved);
      this.toPurchasableVariant(variant, "RETAIL");
      return availableStock >= quantity
        ? { available: true, availableStock }
        : { available: false, availableStock, reason: "Insufficient stock" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { available: false, availableStock: 0, reason: "SKU not found" };
      }
      return {
        available: false,
        availableStock: 0,
        reason: "Variant is not available",
      };
    }
  }

  /**
   * Create and update methods below remain Admin-only controller operations.
   */

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
}
