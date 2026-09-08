import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  VariantsService,
  VARIANT_DELETE_REFERENCE_CONFLICT_MESSAGE,
} from "./variants.service";
import { PrismaService } from "../prisma/prisma.service";

describe("VariantsService", () => {
  let service: VariantsService;

  const mockVariant = {
    id: 1,
    sku: "TEST-001",
    name: "Test Variant",
    options: { color: "Red" },
    price: new Prisma.Decimal(29.99),
    dealerPrice: new Prisma.Decimal(19.99),
    stock: 10,
    reserved: 2,
    status: "ACTIVE",
    product: {
      id: 1,
      name: "Test Product",
      status: "ACTIVE",
      deletedAt: null,
    },
  };

  const mockPrismaService = {
    variant: {
      findUnique: jest.fn().mockResolvedValue(mockVariant),
      findMany: jest.fn().mockResolvedValue([mockVariant]),
      delete: jest.fn(),
    },
    cartItem: { count: jest.fn().mockResolvedValue(0) },
    orderItem: { count: jest.fn().mockResolvedValue(0) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.variant.findUnique.mockResolvedValue(mockVariant);
    mockPrismaService.variant.findMany.mockResolvedValue([mockVariant]);
    mockPrismaService.variant.delete.mockResolvedValue(undefined);
    mockPrismaService.cartItem.count.mockResolvedValue(0);
    mockPrismaService.orderItem.count.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("authenticated SKU lookup", () => {
    it("returns the retail response without internal inventory fields", async () => {
      const result = await service.getVariantBySku("TEST-001", "RETAIL");

      expect(result.sku).toBe("TEST-001");
      expect(result.unitPrice).toBe(29.99);
      expect(result.isPurchasable).toBe(true);
      expect(result.availableStock).toBeUndefined();
      expect(result).not.toHaveProperty("dealerPrice");
      expect(result).not.toHaveProperty("stock");
      expect(result).not.toHaveProperty("reserved");
      expect(result).not.toHaveProperty("status");
    });

    it("returns the dealer price and available stock for dealers", async () => {
      const result = await service.getVariantBySku("TEST-001", "DEALER");

      expect(result.unitPrice).toBe(19.99);
      expect(result.availableStock).toBe(8);
    });

    it("throws 404 when the SKU does not exist", async () => {
      mockPrismaService.variant.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getVariantBySku("INVALID", "RETAIL"),
      ).rejects.toThrow('Variant with SKU "INVALID" not found');
    });
  });

  describe("getPurchasableVariant", () => {
    it("returns the Decimal price and product snapshot for transactions", async () => {
      const result = await service.getPurchasableVariant(1, "RETAIL");

      expect(result.productId).toBe(1);
      expect(result.productName).toBe("Test Product");
      expect(result.variantName).toBe("Test Variant");
      expect(result.unitPrice).toBeInstanceOf(Prisma.Decimal);
      expect(result.unitPrice.toNumber()).toBe(29.99);
      expect(result.availableStock).toBe(8);
    });

    it("uses the variant dealer price for the Dealer audience", async () => {
      const result = await service.getPurchasableVariant(1, "DEALER");

      expect(result.unitPrice.toNumber()).toBe(19.99);
    });

    it("falls back to the retail price when a Dealer SKU price is absent", async () => {
      mockPrismaService.variant.findUnique.mockResolvedValueOnce({
        ...mockVariant,
        dealerPrice: null,
      });

      const result = await service.getPurchasableVariant(1, "DEALER");

      expect(result.unitPrice.toNumber()).toBe(29.99);
    });

    it("throws 400 for inactive or exhausted variants", async () => {
      mockPrismaService.variant.findUnique.mockResolvedValueOnce({
        ...mockVariant,
        stock: 2,
        reserved: 2,
      });

      await expect(
        service.getPurchasableVariant(1, "RETAIL"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("throws 404 when the variant id does not exist", async () => {
      mockPrismaService.variant.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getPurchasableVariant(999, "RETAIL"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("batch SKU lookup", () => {
    it("rejects duplicate SKU values before querying the catalog", async () => {
      await expect(
        service.getVariantsBySkus(["TEST-001", "TEST-001"], "RETAIL"),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("admin variant deletion", () => {
    it("keeps a missing SKU as a 404 and does not check references", async () => {
      mockPrismaService.variant.findUnique.mockResolvedValueOnce(null);

      let thrown: unknown;
      try {
        await service.deleteVariant(999);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(NotFoundException);
      expect((thrown as NotFoundException).getStatus()).toBe(404);
      expect(mockPrismaService.cartItem.count).not.toHaveBeenCalled();
      expect(mockPrismaService.orderItem.count).not.toHaveBeenCalled();
      expect(mockPrismaService.variant.delete).not.toHaveBeenCalled();
    });

    it("returns a 409 with deactivation guidance when cart items reference the SKU", async () => {
      mockPrismaService.cartItem.count.mockResolvedValueOnce(1);

      let thrown: unknown;
      try {
        await service.deleteVariant(1);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ConflictException);
      expect((thrown as ConflictException).getStatus()).toBe(409);
      expect((thrown as ConflictException).message).toBe(
        VARIANT_DELETE_REFERENCE_CONFLICT_MESSAGE,
      );
      expect(mockPrismaService.variant.delete).not.toHaveBeenCalled();
    });

    it("returns a 409 with deactivation guidance when order items reference the SKU", async () => {
      mockPrismaService.orderItem.count.mockResolvedValueOnce(1);

      let thrown: unknown;
      try {
        await service.deleteVariant(1);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ConflictException);
      expect((thrown as ConflictException).getStatus()).toBe(409);
      expect((thrown as ConflictException).message).toBe(
        VARIANT_DELETE_REFERENCE_CONFLICT_MESSAGE,
      );
      expect(mockPrismaService.variant.delete).not.toHaveBeenCalled();
    });

    it("physically deletes an unreferenced SKU", async () => {
      await expect(service.deleteVariant(1)).resolves.toBeUndefined();

      expect(mockPrismaService.cartItem.count).toHaveBeenCalledWith({
        where: { variantId: 1 },
      });
      expect(mockPrismaService.orderItem.count).toHaveBeenCalledWith({
        where: { variantId: 1 },
      });
      expect(mockPrismaService.variant.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("converts a concurrent foreign-key constraint failure into the same 409", async () => {
      mockPrismaService.variant.delete.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Foreign key constraint", {
          code: "P2003",
          clientVersion: "test",
        }),
      );

      let thrown: unknown;
      try {
        await service.deleteVariant(1);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ConflictException);
      expect((thrown as ConflictException).getStatus()).toBe(409);
      expect((thrown as ConflictException).message).toBe(
        VARIANT_DELETE_REFERENCE_CONFLICT_MESSAGE,
      );
    });
  });
});
