import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { VariantsService } from "./variants.service";
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
    },
  };

  beforeEach(async () => {
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
});
