import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { CartService } from "./cart.service";
import { PrismaService } from "../prisma/prisma.service";
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

describe("CartService", () => {
  const prisma = {
    cart: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    cartItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const variantsService = {
    getPurchasableVariant: jest.fn(),
  } as unknown as VariantsService;

  const service = new CartService(prisma, variantsService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("getCart", () => {
    it("returns server-resolved price, name and stock for each item", async () => {
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockResolvedValue(purchasable());
      jest.spyOn(prisma.cart, "upsert").mockResolvedValue({
        id: 1,
        userId: 10,
        createdAt: now,
        updatedAt: now,
        items: [
          {
            id: 10,
            variantId: 101,
            quantity: 2,
            unitPrice: new Prisma.Decimal(0),
            variant: {
              sku: "BLOCK-50-STD",
              name: "标准款",
              product: { name: "50块标准款套装" },
            },
          },
        ],
      } as never);

      const result = await service.getCart(10, UserRole.USER);

      expect(result.id).toBe(1);
      expect(result.itemCount).toBe(2);
      expect(result.totalAmount).toBe(59.98);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 10,
        variantId: 101,
        sku: "BLOCK-50-STD",
        productName: "50块标准款套装",
        variantName: "标准款",
        quantity: 2,
        unitPrice: 29.99,
        subtotal: 59.98,
        availableStock: 20,
        isPurchasable: true,
      });
    });

    it("marks an item as unavailable when the SKU is no longer purchasable", async () => {
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockRejectedValue(
          new BadRequestException("Variant is not available for purchase"),
        );
      jest.spyOn(prisma.cart, "upsert").mockResolvedValue({
        id: 1,
        userId: 10,
        createdAt: now,
        updatedAt: now,
        items: [
          {
            id: 10,
            variantId: 101,
            quantity: 1,
            unitPrice: new Prisma.Decimal(29.99),
            variant: {
              sku: "BLOCK-50-STD",
              name: "标准款",
              product: { name: "50块标准款套装" },
            },
          },
        ],
      } as never);

      const result = await service.getCart(10, UserRole.USER);

      expect(result.items[0].isPurchasable).toBe(false);
      expect(result.items[0].availableStock).toBe(0);
      expect(result.items[0].sku).toBe("BLOCK-50-STD");
    });
  });

  describe("addItem", () => {
    it("creates a new item with the server-side unit price", async () => {
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockResolvedValue(purchasable());
      jest.spyOn(prisma.cart, "upsert").mockResolvedValue({
        id: 1,
        items: [],
      } as never);
      jest.spyOn(prisma.cartItem, "findUnique").mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prisma.cartItem, "create")
        .mockResolvedValue({
          id: 11,
          variantId: 101,
          quantity: 2,
          unitPrice: new Prisma.Decimal(29.99),
        } as never);

      const result = await service.addItem(10, UserRole.USER, 101, 2);

      expect(result.unitPrice).toBe(29.99);
      expect(result.subtotal).toBe(59.98);
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          cartId: 1,
          variantId: 101,
          quantity: 2,
          unitPrice: expect.any(Prisma.Decimal),
        },
      });
    });

    it("accumulates quantity and validates against stock", async () => {
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockResolvedValue(purchasable({ availableStock: 5 }));
      jest.spyOn(prisma.cart, "upsert").mockResolvedValue({
        id: 1,
        items: [],
      } as never);
      jest.spyOn(prisma.cartItem, "findUnique").mockResolvedValue({
        id: 11,
        variantId: 101,
        quantity: 3,
        unitPrice: new Prisma.Decimal(29.99),
      } as never);
      const updateSpy = jest
        .spyOn(prisma.cartItem, "update")
        .mockResolvedValue({
          id: 11,
          variantId: 101,
          quantity: 4,
          unitPrice: new Prisma.Decimal(29.99),
        } as never);

      const result = await service.addItem(10, UserRole.USER, 101, 1);

      expect(result.quantity).toBe(4);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 11 },
        data: { quantity: 4, unitPrice: expect.any(Prisma.Decimal) },
      });
    });

    it("throws 400 when the accumulated quantity exceeds stock", async () => {
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockResolvedValue(purchasable({ availableStock: 3 }));
      jest.spyOn(prisma.cart, "upsert").mockResolvedValue({
        id: 1,
        items: [],
      } as never);
      jest.spyOn(prisma.cartItem, "findUnique").mockResolvedValue({
        id: 11,
        variantId: 101,
        quantity: 2,
        unitPrice: new Prisma.Decimal(29.99),
      } as never);

      await expect(service.addItem(10, UserRole.USER, 101, 2)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("propagates 404 for an unknown variant", async () => {
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockRejectedValue(new NotFoundException("Variant not found"));

      await expect(service.addItem(10, UserRole.USER, 999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateItem", () => {
    it("throws 400 when the requested quantity exceeds stock", async () => {
      jest.spyOn(prisma.cart, "findUnique").mockResolvedValue({
        id: 1,
        userId: 10,
      } as never);
      jest.spyOn(prisma.cartItem, "findUnique").mockResolvedValue({
        id: 11,
        cartId: 1,
        variantId: 101,
        quantity: 1,
        unitPrice: new Prisma.Decimal(29.99),
      } as never);
      jest
        .spyOn(variantsService, "getPurchasableVariant")
        .mockResolvedValue(purchasable({ availableStock: 2 }));

      await expect(
        service.updateItem(10, UserRole.USER, 11, 5),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
