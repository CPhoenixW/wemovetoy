import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { VariantStatus } from "@prisma/client";
import { VariantResponseDto } from "./dto/variant-response.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class VariantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据 SKU 查询变体信息（供购物车和订单调用）
   * @param sku - 商品 SKU
   * @param userId - 当前用户 ID（用于判断角色，如果是经销商则返回经销商价）
   * @param isDealer - 是否为经销商（简化版，也可以用 JWT 中的角色）
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

    // 判断是否可购买
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
   * 校验库存是否充足（供订单模块调用）
   * @returns 是否可购买，以及剩余库存
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
