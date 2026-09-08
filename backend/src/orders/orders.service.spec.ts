import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, Prisma, UserRole } from "@prisma/client";
import { OrdersService } from "./orders.service";
import { PrismaService } from "../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { VariantsService } from "../products/variants.service";

const now = new Date("2026-09-06T00:00:00.000Z");

function purchasable(overrides: Record<string, unknown> = {}) {
  return {
    variantId: 101,
    sku: "BLOCK-50-STD",
    productId: 1,
    productName: "50块标准款套装",
    variantName: "标准款",
    unitPrice: new Prisma.Decimal(29.99),
    availableStock: 20,
    isPurchasable: true,
    ...overrides,
  };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 5001,
    userId: 10,
    orderNumber: "WM2026090612345678",
    status: OrderStatus.PENDING,
    totalAmount: new Prisma.Decimal(59.98),
    shippingName: "张三",
    shippingPhone: "13000000000",
    shippingAddress: "北京市",
    remark: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 1,
        orderId: 5001,
        variantId: 101,
        sku: "BLOCK-50-STD",
        productName: "50块标准款套装",
        variantName: "标准款",
        quantity: 2,
        unitPrice: new Prisma.Decimal(29.99),
        subtotal: new Prisma.Decimal(59.98),
        createdAt: now,
      },
    ],
    ...overrides,
  };
}

describe("OrdersService", () => {
  const prisma = {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    variant: {
      update: jest.fn().mockResolvedValue({}),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const cartService = {
    getCartForCheckout: jest.fn(),
  } as unknown as CartService;

  const variantsService = {
    getPurchasableVariant: jest.fn(),
  } as unknown as VariantsService;

  const service = new OrdersService(prisma, cartService, variantsService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("createOrder", () => {
    it("throws 400 for an empty cart", async () => {
      jest
        .spyOn(cartService, "getCartForCheckout")
        .mockResolvedValue({ id: 1, items: [] } as never);

      await expect(service.createOrder(10, UserRole.USER, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("saves a real SKU/name/price snapshot and clears the cart", async () => {
      jest.spyOn(cartService, "getCartForCheckout").mockResolvedValue({
        id: 1,
        items: [{ variantId: 101, quantity: 2 }],
      } as never);
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockResolvedValue(purchasable());

      const tx = {
        order: { create: jest.fn().mockResolvedValue(makeOrder()) },
        variant: { update: jest.fn().mockResolvedValue({}) },
        cartItem: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      const result = await service.createOrder(10, UserRole.USER, {
        shippingName: "张三",
      });

      expect(tx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                variantId: 101,
                sku: "BLOCK-50-STD",
                productName: "50块标准款套装",
                variantName: "标准款",
                quantity: 2,
              }),
            ],
          },
        }),
        include: { items: true },
      });
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 1 },
      });
      // 预留模式:下单时把购买数量累加到 reserved
      expect(tx.variant.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { reserved: { increment: 2 } },
      });

      expect(result.totalAmount).toBe(59.98);
      expect(result.items[0].sku).toBe("BLOCK-50-STD");
      expect(result.items[0].productName).toBe("50块标准款套装");
    });

    it("re-checks stock and throws 400 when quantity exceeds availability", async () => {
      jest.spyOn(cartService, "getCartForCheckout").mockResolvedValue({
        id: 1,
        items: [{ variantId: 101, quantity: 5 }],
      } as never);
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockResolvedValue(purchasable({ availableStock: 2 }));

      await expect(service.createOrder(10, UserRole.USER, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findMyOrders", () => {
    it("returns a paginated list of the user's orders", async () => {
      jest.spyOn(prisma.order, "findMany").mockResolvedValue([makeOrder()]);
      jest.spyOn(prisma.order, "count").mockResolvedValue(1);

      const result = await service.findMyOrders(10, 1, 20);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].items[0].sku).toBe("BLOCK-50-STD");
    });
  });

  describe("findOrderById", () => {
    it("returns the order for its owner", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      const result = await service.findOrderById(5001, 10, UserRole.USER);

      expect(result.id).toBe(5001);
      expect(result.items[0].unitPrice).toBe(29.99);
    });

    it("allows an admin to read any order", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      await expect(
        service.findOrderById(5001, 99, UserRole.ADMIN),
      ).resolves.toMatchObject({ id: 5001 });
    });

    it("throws 403 for a non-owner non-admin", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      await expect(
        service.findOrderById(5001, 99, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it("throws 404 for a missing order", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(null);

      await expect(
        service.findOrderById(5001, 10, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("cancelOrder", () => {
    it("cancels the owner's pending order and releases reserved stock", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      const tx = {
        variant: { update: jest.fn().mockResolvedValue({}) },
        order: {
          update: jest
            .fn()
            .mockResolvedValue(makeOrder({ status: OrderStatus.CANCELLED })),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      const result = await service.cancelOrder(5001, 10);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      // 预留模式:取消时释放之前预留的 reserved 数量
      expect(tx.variant.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { reserved: { decrement: 2 } },
      });
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 5001 },
        data: { status: OrderStatus.CANCELLED },
        include: { items: true },
      });
    });

    it("throws 400 when the order is not pending", async () => {
      jest
        .spyOn(prisma.order, "findUnique")
        .mockResolvedValue(makeOrder({ status: OrderStatus.PAID }));

      await expect(service.cancelOrder(5001, 10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws 403 for a non-owner", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      await expect(service.cancelOrder(5001, 99)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("adminFindAll", () => {
    it("maps the customer and item count without leaking items", async () => {
      jest.spyOn(prisma.order, "findMany").mockResolvedValue([
        {
          ...makeOrder(),
          user: {
            id: 10,
            email: "user@example.com",
            name: "Demo User",
            role: UserRole.USER,
          },
        },
      ] as never);
      jest.spyOn(prisma.order, "count").mockResolvedValue(1);

      const result = await service.adminFindAll(1, 20);

      expect(result.items[0]).toEqual({
        id: 5001,
        orderNumber: "WM2026090612345678",
        status: OrderStatus.PENDING,
        totalAmount: 59.98,
        itemCount: 1,
        customer: {
          id: 10,
          email: "user@example.com",
          name: "Demo User",
          role: UserRole.USER,
        },
        dealerCompany: null,
        createdAt: now,
      });
    });

    it("filters by status and search", async () => {
      const findManySpy = jest
        .spyOn(prisma.order, "findMany")
        .mockResolvedValue([]);
      jest.spyOn(prisma.order, "count").mockResolvedValue(0);

      await service.adminFindAll(1, 20, OrderStatus.PENDING, "user@example");

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.PENDING,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe("adminUpdateStatus", () => {
    it("PENDING → PAID converts reservation to real stock deduction", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      const tx = {
        variant: { update: jest.fn().mockResolvedValue({}) },
        order: {
          update: jest
            .fn()
            .mockResolvedValue(makeOrder({ status: OrderStatus.PAID })),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      const result = await service.adminUpdateStatus(5001, OrderStatus.PAID);

      expect(result.status).toBe(OrderStatus.PAID);
      // 预留转真实扣减:stock 和 reserved 同时扣减下单数量
      expect(tx.variant.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: {
          stock: { decrement: 2 },
          reserved: { decrement: 2 },
        },
      });
    });

    it("PENDING → CANCELLED releases reserved stock", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      const tx = {
        variant: { update: jest.fn().mockResolvedValue({}) },
        order: {
          update: jest
            .fn()
            .mockResolvedValue(makeOrder({ status: OrderStatus.CANCELLED })),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      const result = await service.adminUpdateStatus(
        5001,
        OrderStatus.CANCELLED,
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
      // 仅释放预留,不动 stock
      expect(tx.variant.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { reserved: { decrement: 2 } },
      });
    });

    it("PAID → CANCELLED refunds stock", async () => {
      jest
        .spyOn(prisma.order, "findUnique")
        .mockResolvedValue(makeOrder({ status: OrderStatus.PAID }));

      const tx = {
        variant: { update: jest.fn().mockResolvedValue({}) },
        order: {
          update: jest
            .fn()
            .mockResolvedValue(makeOrder({ status: OrderStatus.CANCELLED })),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      const result = await service.adminUpdateStatus(
        5001,
        OrderStatus.CANCELLED,
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
      // 已扣减的 stock 回补
      expect(tx.variant.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { stock: { increment: 2 } },
      });
    });

    it("throws 400 for an invalid transition", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      await expect(
        service.adminUpdateStatus(5001, OrderStatus.SHIPPED),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
