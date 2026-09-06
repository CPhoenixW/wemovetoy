import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Cart, CartItem, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  PriceAudience,
  PurchasableVariant,
  VariantsService,
} from "../products/variants.service";

export interface CartItemResponse {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  availableStock: number;
  isPurchasable: boolean;
}

export interface CartResponse {
  id: number;
  items: CartItemResponse[];
  itemCount: number;
  totalAmount: number;
  updatedAt: Date;
}

type CartItemForDisplay = Prisma.CartItemGetPayload<{
  include: {
    variant: {
      select: {
        sku: true;
        name: true;
        product: { select: { name: true } };
      };
    };
  };
}>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly variantsService: VariantsService,
  ) {}

  /**
   * Return the user's cart enriched with server-resolved SKU, price and
   * availability. The price and stock are never taken from the request body.
   */
  async getCart(userId: number, role: UserRole): Promise<CartResponse> {
    const audience = this.toAudience(role);
    const cart = await this.getCartWithVariants(userId);

    const items: CartItemResponse[] = [];
    for (const item of cart.items) {
      try {
        const purchasable = await this.variantsService.getPurchasableVariant(
          item.variantId,
          audience,
        );
        items.push(this.toCartItem(item, purchasable));
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          items.push(this.toUnavailableCartItem(item));
          continue;
        }
        throw error;
      }
    }

    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: this.roundMoney(
        items.reduce((sum, item) => sum + item.subtotal, 0),
      ),
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Return the raw cart (for order checkout). The order service re-resolves
   * price and stock through the variants service, so no price is trusted here.
   */
  async getCartForCheckout(
    userId: number,
  ): Promise<Cart & { items: CartItem[] }> {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
  }

  /**
   * Add a variant to the cart using its real SKU, price and stock. If the
   * variant already exists, the quantity is accumulated and re-validated
   * against the available stock.
   */
  async addItem(
    userId: number,
    role: UserRole,
    variantId: number,
    quantity: number,
  ): Promise<CartItemResponse> {
    const audience = this.toAudience(role);
    const purchasable = await this.variantsService.getPurchasableVariant(
      variantId,
      audience,
    );

    const cart = await this.getCartForCheckout(userId);
    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId: cart.id, variantId },
      },
    });

    const nextQuantity = existing ? existing.quantity + quantity : quantity;
    if (nextQuantity > purchasable.availableStock) {
      throw new BadRequestException(
        `Insufficient stock for variant ${purchasable.sku}`,
      );
    }

    const unitPrice = purchasable.unitPrice;
    const item = existing
      ? await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: nextQuantity, unitPrice },
        })
      : await this.prisma.cartItem.create({
          data: { cartId: cart.id, variantId, quantity, unitPrice },
        });

    return this.toCartItem(item, purchasable);
  }

  /**
   * Update the quantity of an existing cart item, re-validating stock and
   * refreshing the server-side unit price.
   */
  async updateItem(
    userId: number,
    role: UserRole,
    itemId: number,
    quantity: number,
  ): Promise<CartItemResponse> {
    const audience = this.toAudience(role);
    const item = await this.findOwnedItem(userId, itemId);
    const purchasable = await this.variantsService.getPurchasableVariant(
      item.variantId,
      audience,
    );

    if (quantity > purchasable.availableStock) {
      throw new BadRequestException(
        `Insufficient stock for variant ${purchasable.sku}`,
      );
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity, unitPrice: purchasable.unitPrice },
    });

    return this.toCartItem(updated, purchasable);
  }

  /**
   * Remove an item from the cart.
   */
  async removeItem(userId: number, itemId: number): Promise<void> {
    const item = await this.findOwnedItem(userId, itemId);
    await this.prisma.cartItem.delete({ where: { id: item.id } });
  }

  /**
   * Remove all items from the user's cart.
   */
  async clearCart(userId: number): Promise<void> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }

  private toAudience(role: UserRole): PriceAudience {
    return role === UserRole.DEALER ? "DEALER" : "RETAIL";
  }

  private async getCartWithVariants(userId: number): Promise<
    Cart & {
      items: CartItemForDisplay[];
    }
  > {
    return this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            variant: {
              select: {
                sku: true,
                name: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }

  private toCartItem(
    item: { id: number; variantId: number; quantity: number },
    purchasable: PurchasableVariant,
  ): CartItemResponse {
    const unitPrice = purchasable.unitPrice.toNumber();
    return {
      id: item.id,
      variantId: item.variantId,
      sku: purchasable.sku,
      productName: purchasable.productName,
      variantName: purchasable.variantName,
      quantity: item.quantity,
      unitPrice,
      subtotal: this.roundMoney(unitPrice * item.quantity),
      availableStock: purchasable.availableStock,
      isPurchasable: true,
    };
  }

  private toUnavailableCartItem(item: CartItemForDisplay): CartItemResponse {
    const unitPrice = item.unitPrice.toNumber();
    return {
      id: item.id,
      variantId: item.variantId,
      sku: item.variant.sku,
      productName: item.variant.product.name,
      variantName: item.variant.name,
      quantity: item.quantity,
      unitPrice,
      subtotal: this.roundMoney(unitPrice * item.quantity),
      availableStock: 0,
      isPurchasable: false,
    };
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async findOwnedItem(
    userId: number,
    itemId: number,
  ): Promise<CartItem> {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw new NotFoundException("Cart item not found");
    }
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException("Cart item not found");
    }
    return item;
  }
}
