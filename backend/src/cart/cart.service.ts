import { Injectable, NotFoundException } from "@nestjs/common";
import { Cart, CartItem, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * TODO(member-2): Replace this placeholder with a call to ProductsService
 * once the products module is available. The unit price must never be
 * trusted from the client; it must be resolved server-side from the
 * product/variant catalog owned by member 2.
 */
interface VariantPriceProvider {
  getUnitPrice(variantId: number): Promise<Prisma.Decimal>;
}

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    // TODO(member-2): inject ProductsService here once it exists, e.g.
    // private readonly productsService: ProductsService,
  ) {}

  /**
   * Return the user's cart with all items. Creates an empty cart if none
   * exists yet.
   */
  async getCart(userId: number): Promise<Cart & { items: CartItem[] }> {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });
    return cart;
  }

  /**
   * Add a variant to the cart. If the variant already exists in the cart,
   * the quantity is increased. The unit price is resolved server-side.
   */
  async addItem(
    userId: number,
    variantId: number,
    quantity: number,
  ): Promise<CartItem> {
    const cart = await this.getCart(userId);
    const unitPrice = this.resolveUnitPrice(variantId);

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId: cart.id, variantId },
      },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
          unitPrice,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId,
        quantity,
        unitPrice,
      },
    });
  }

  /**
   * Update the quantity of an existing cart item.
   */
  async updateItem(
    userId: number,
    itemId: number,
    quantity: number,
  ): Promise<CartItem> {
    const item = await this.findOwnedItem(userId, itemId);
    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
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

  /**
   * Resolve the unit price for a variant.
   *
   * TODO(member-2): Replace the placeholder below with a real call to
   * ProductsService (or the variant catalog service) once member 2 ships
   * the products module. The price must come from the server, not the
   * request body.
   */
  private resolveUnitPrice(variantId: number): Prisma.Decimal {
    // Placeholder: return a zero price. This keeps the cart flow testable
    // before the products module exists. Replace with an async ProductsService
    // call once member 2 ships the products module.
    void variantId;
    return new Prisma.Decimal(0);
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

// Re-export the interface for testing / future wiring.
export type { VariantPriceProvider };
