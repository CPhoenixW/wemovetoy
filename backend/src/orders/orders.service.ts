import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Order,
  OrderItem,
  OrderStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { CreateOrderDto } from "./dto/create-order.dto";

/**
 * Allowed order status transitions. Any status not listed cannot transition
 * further (terminal states).
 */
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  /**
   * Create an order from the user's current cart. Each cart item becomes an
   * order item with a price and product snapshot. The cart is cleared after
   * the order is created.
   */
  async createOrder(
    userId: number,
    input: CreateOrderDto,
  ): Promise<Order & { items: OrderItem[] }> {
    const cart = await this.cartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException(
        "Cannot create an order from an empty cart",
      );
    }

    const orderNumber = this.generateOrderNumber();
    let totalAmount = new Prisma.Decimal(0);

    const orderItemsData = cart.items.map((item) => {
      const subtotal = item.unitPrice.mul(item.quantity);
      totalAmount = totalAmount.add(subtotal);
      return {
        variantId: item.variantId,
        // TODO(member-2): fetch the real product/variant names from
        // ProductsService once the products module is available. Snapshots
        // must be stored at order time so later catalog changes do not
        // affect historical orders.
        productName: `Variant #${item.variantId}`,
        variantName: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal,
      };
    });

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          orderNumber,
          totalAmount,
          shippingName: input.shippingName,
          shippingPhone: input.shippingPhone,
          shippingAddress: input.shippingAddress,
          remark: input.remark,
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    return order;
  }

  /**
   * List the current user's orders, newest first.
   */
  async findMyOrders(userId: number): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get one order with its items. Only the owner or an admin may view it.
   */
  async findOrderById(
    id: number,
    userId: number,
    role: UserRole,
  ): Promise<Order & { items: OrderItem[] }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.userId !== userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "You do not have permission to view this order",
      );
    }
    return order;
  }

  /**
   * Cancel an order. Only the owner may cancel, and only while it is PENDING.
   */
  async cancelOrder(id: number, userId: number): Promise<Order> {
    const order = await this.findOrderById(id, userId, UserRole.USER);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("Only pending orders can be cancelled");
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }

  /**
   * Admin: update the order status following the allowed transition rules.
   */
  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const allowed = STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${status}`,
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Generate a unique-ish order number based on the current timestamp.
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const pad = (n: number, len = 2): string => n.toString().padStart(len, "0");
    const timestamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const random = Math.floor(1000 + Math.random() * 9000);
    return `WM${timestamp}${random}`;
  }
}
