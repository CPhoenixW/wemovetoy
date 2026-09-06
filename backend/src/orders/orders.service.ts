import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { OrderItem, OrderStatus, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { VariantsService } from "../products/variants.service";
import { CreateOrderDto } from "./dto/create-order.dto";

export interface OrderItemResponse {
  id: number;
  variantId: number;
  sku: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderResponse {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemResponse[];
}

export interface SafeOrderUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface AdminOrderListItem {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  customer: SafeOrderUser;
  dealerCompany: null;
  createdAt: Date;
}

export interface PaginatedOrders<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type OrderWithRelations = Prisma.OrderGetPayload<{ include: { items: true } }>;

type AdminOrderRow = Prisma.OrderGetPayload<{
  include: {
    items: { select: { id: true } };
    user: { select: { id: true; email: true; name: true; role: true } };
  };
}>;

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
    private readonly variantsService: VariantsService,
  ) {}

  /**
   * Create an order from the user's current cart, re-checking stock and
   * re-resolving price and names through the SKU service. The order and the
   * cart clearing happen inside a single transaction.
   */
  async createOrder(
    userId: number,
    role: UserRole,
    input: CreateOrderDto,
  ): Promise<OrderResponse> {
    const audience = role === UserRole.DEALER ? "DEALER" : "RETAIL";
    const cart = await this.cartService.getCartForCheckout(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException(
        "Cannot create an order from an empty cart",
      );
    }

    const orderNumber = this.generateOrderNumber();
    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] =
      [];

    for (const item of cart.items) {
      const purchasable = await this.variantsService.getPurchasableVariant(
        item.variantId,
        audience,
      );
      if (item.quantity > purchasable.availableStock) {
        throw new BadRequestException(
          `Insufficient stock for variant ${purchasable.sku}`,
        );
      }

      const subtotal = purchasable.unitPrice.mul(item.quantity);
      totalAmount = totalAmount.add(subtotal);
      orderItemsData.push({
        variantId: purchasable.variantId,
        sku: purchasable.sku,
        productName: purchasable.productName,
        variantName: purchasable.variantName,
        quantity: item.quantity,
        unitPrice: purchasable.unitPrice,
        subtotal,
      });
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          orderNumber,
          status: OrderStatus.PENDING,
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

    return this.toOrderResponse(order);
  }

  /**
   * List the current user's orders, newest first, as a paginated response.
   */
  async findMyOrders(
    userId: number,
    page: number,
    pageSize: number,
  ): Promise<PaginatedOrders<OrderResponse>> {
    const where: Prisma.OrderWhereInput = { userId };
    const skip = (page - 1) * pageSize;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: { items: true },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.toOrderResponse(order)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get one order with its items. Only the owner or an admin may view it.
   */
  async findOrderById(
    id: number,
    userId: number,
    role: UserRole,
  ): Promise<OrderResponse> {
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
    return this.toOrderResponse(order);
  }

  /**
   * Cancel an order. Only the owner may cancel, and only while it is PENDING.
   */
  async cancelOrder(id: number, userId: number): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.userId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to cancel this order",
      );
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException("Only pending orders can be cancelled");
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: { items: true },
    });

    return this.toOrderResponse(updated);
  }

  /**
   * Admin: list all orders with optional status and search filters.
   */
  async adminFindAll(
    page: number,
    pageSize: number,
    status?: OrderStatus,
    search?: string,
  ): Promise<PaginatedOrders<AdminOrderListItem>> {
    const where: Prisma.OrderWhereInput = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          items: { select: { id: true } },
          user: { select: { id: true, email: true, name: true, role: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.toAdminListItem(order)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Admin: get one order with its snapshot and customer.
   */
  async adminFindById(
    id: number,
  ): Promise<OrderResponse & { customer: SafeOrderUser }> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return {
      ...this.toOrderResponse(order),
      customer: this.toSafeUser(order.user),
    };
  }

  /**
   * Admin: update the order status following the allowed transition rules.
   */
  async adminUpdateStatus(
    id: number,
    status: OrderStatus,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const allowed = STATUS_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${status}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    return this.toOrderResponse(updated);
  }

  private toOrderResponse(order: OrderWithRelations): OrderResponse {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount.toNumber(),
      shippingName: order.shippingName,
      shippingPhone: order.shippingPhone,
      shippingAddress: order.shippingAddress,
      remark: order.remark,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => this.toOrderItem(item)),
    };
  }

  private toOrderItem(item: OrderItem): OrderItemResponse {
    return {
      id: item.id,
      variantId: item.variantId,
      sku: item.sku,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toNumber(),
      subtotal: item.subtotal.toNumber(),
    };
  }

  private toAdminListItem(order: AdminOrderRow): AdminOrderListItem {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount.toNumber(),
      itemCount: order.items.length,
      customer: this.toSafeUser(order.user),
      dealerCompany: null,
      createdAt: order.createdAt,
    };
  }

  private toSafeUser(user: {
    id: number;
    email: string;
    name: string | null;
    role: UserRole;
  }): SafeOrderUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
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
