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
      updateMany: jest.fn(),
    },
    variant: {
      update: jest.fn().mockResolvedValue({}),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
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
        $executeRaw: jest.fn().mockResolvedValue(1),
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
      // 原子条件更新:预留前在同一事务内重新校验可售状态 + (stock-reserved)>=qty
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      // 预留成功后才创建订单
      expect(tx.order.create).toHaveBeenCalled();

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

    it("rolls back when atomic reservation loses the race (concurrent oversell)", async () => {
      // 预检查通过(availableStock=20 >= 2),但事务内的条件 UPDATE 受影响行数为 0
      // —— 模拟另一个并发结算刚刚把库存预留光了。必须回滚订单创建并抛 400。
      jest.spyOn(cartService, "getCartForCheckout").mockResolvedValue({
        id: 1,
        items: [{ variantId: 101, quantity: 2 }],
      } as never);
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockResolvedValue(purchasable());

      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(0),
        order: { create: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      await expect(service.createOrder(10, UserRole.USER, {})).rejects.toThrow(
        BadRequestException,
      );
      // 原子更新失败时不应创建订单,也不应清购物车
      expect(tx.order.create).not.toHaveBeenCalled();
      expect(tx.cartItem.deleteMany).not.toHaveBeenCalled();
    });

    it("locks variants in ascending variantId order to avoid deadlock", async () => {
      // 多 SKU 下单:购物车按 105→103 给出,但加锁顺序必须是 103→105(升序),
      // 否则与另一笔 103→105 的订单交叉时会产生 A→B / B→A 死锁。
      jest.spyOn(cartService, "getCartForCheckout").mockResolvedValue({
        id: 1,
        items: [
          { variantId: 105, quantity: 1 },
          { variantId: 103, quantity: 1 },
        ],
      } as never);
      const v103 = purchasable({ variantId: 103, sku: "V-103" });
      const v105 = purchasable({ variantId: 105, sku: "V-105" });
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockResolvedValueOnce(v103)
        .mockResolvedValueOnce(v105);

      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        order: { create: jest.fn().mockResolvedValue(makeOrder()) },
        cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      await service.createOrder(10, UserRole.USER, {});

      // 两次 $executeRaw 的 variantId 参数顺序必须是 103, 105(升序)。
      // tagged template 的调用签名是 [strings, ...values],本 SQL 的插值顺序是
      // ${quantity}, ${variantId}, ${quantity},故 variantId 位于每条调用的下标 2。
      const calls = tx.$executeRaw.mock.calls;
      expect(calls).toHaveLength(2);
      const lockedIds = calls.map((c) => c[2] as number);
      expect(lockedIds).toEqual([103, 105]);
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
        $executeRaw: jest.fn().mockResolvedValue(1),
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest
            .fn()
            .mockResolvedValue(makeOrder({ status: OrderStatus.CANCELLED })),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      const result = await service.cancelOrder(5001, 10);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      // 原子条件状态转换:只有当订单仍是 PENDING 时才改为 CANCELLED
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 5001, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
      // 赢得状态竞争后才用条件 UPDATE 释放预留(reserved >= qty 才放行)
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
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

    it("rolls back when concurrent status change loses the race", async () => {
      // 预检查看到 PENDING,但事务内条件 updateMany 返回 count=0
      // —— 模拟另一个并发取消(或转 PAID)刚刚赢走了状态竞争。
      // 必须抛错且不能重复释放预留。
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      const tx = {
        $executeRaw: jest.fn(),
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn(),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      await expect(service.cancelOrder(5001, 10)).rejects.toThrow(
        BadRequestException,
      );
      // 状态竞争失败,绝不能动库存
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it("rolls back with 500 when reserved balance underflows (balance protection)", async () => {
      // 历史数据/人工修复导致 reserved < quantity:条件 UPDATE 受影响行数 = 0,
      // 必须抛错并回滚,绝不让 reserved 变负。
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      const tx = {
        // 状态转换成功(count=1),但 reserved 释放受影响行数 = 0
        $executeRaw: jest.fn().mockResolvedValue(0),
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn(),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      await expect(service.cancelOrder(5001, 10)).rejects.toThrow(
        "Reserved balance underflow",
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
        $executeRaw: jest.fn().mockResolvedValue(1),
        variant: { update: jest.fn() },
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest
            .fn()
            .mockResolvedValue(makeOrder({ status: OrderStatus.PAID })),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      const result = await service.adminUpdateStatus(5001, OrderStatus.PAID);

      expect(result.status).toBe(OrderStatus.PAID);
      // 原子条件状态转换:只有当订单仍是 PENDING 时才改为 PAID
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 5001, status: OrderStatus.PENDING },
        data: { status: OrderStatus.PAID },
      });
      // 预留转真实扣减:条件 UPDATE 同时扣 stock 和 reserved(要求余额 >= qty)
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("PENDING → CANCELLED releases reserved stock", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        variant: { update: jest.fn() },
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest
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
      // 原子条件状态转换:只有当订单仍是 PENDING 时才改为 CANCELLED
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 5001, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
      // 仅条件释放预留,不动 stock
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it("PAID → CANCELLED refunds stock", async () => {
      jest
        .spyOn(prisma.order, "findUnique")
        .mockResolvedValue(makeOrder({ status: OrderStatus.PAID }));

      const tx = {
        $executeRaw: jest.fn(),
        variant: { update: jest.fn().mockResolvedValue({}) },
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest
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
      // 原子条件状态转换:只有当订单仍是 PAID 时才改为 CANCELLED
      expect(tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 5001, status: OrderStatus.PAID },
        data: { status: OrderStatus.CANCELLED },
      });
      // 退款回补 stock(增量,无变负风险,无需条件保护)
      expect(tx.variant.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { stock: { increment: 2 } },
      });
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });

    it("throws 400 for an invalid transition", async () => {
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      await expect(
        service.adminUpdateStatus(5001, OrderStatus.SHIPPED),
      ).rejects.toThrow(BadRequestException);
    });

    it("rolls back when concurrent status change loses the race", async () => {
      // 预检查看到 PENDING,但事务内条件 updateMany 返回 count=0
      // —— 模拟并发调用(取消 vs 转 PAID)抢走了状态。
      // 必须抛错且不能动库存,保证订单状态与库存一致。
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      const tx = {
        $executeRaw: jest.fn(),
        variant: { update: jest.fn() },
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUnique: jest.fn(),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      await expect(
        service.adminUpdateStatus(5001, OrderStatus.PAID),
      ).rejects.toThrow(BadRequestException);
      // 状态竞争失败,绝不能动库存
      expect(tx.$executeRaw).not.toHaveBeenCalled();
      expect(tx.variant.update).not.toHaveBeenCalled();
    });

    it("rolls back with 500 when reserved balance underflows on PENDING→PAID", async () => {
      // 历史数据/人工修复导致 reserved < quantity:条件 UPDATE 受影响行数 = 0,
      // 必须抛错并回滚,绝不让 stock/reserved 变负。
      jest.spyOn(prisma.order, "findUnique").mockResolvedValue(makeOrder());

      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(0),
        variant: { update: jest.fn() },
        order: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUnique: jest.fn(),
        },
      };
      jest
        .spyOn(prisma, "$transaction")
        .mockImplementation(async (fn) => fn(tx as never));

      await expect(
        service.adminUpdateStatus(5001, OrderStatus.PAID),
      ).rejects.toThrow("Stock/reserved balance underflow");
    });
  });
});
