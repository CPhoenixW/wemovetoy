import { Test, TestingModule } from "@nestjs/testing";
import { VariantsService } from "./variants.service";
import { PrismaService } from "../prisma/prisma.service";

describe("VariantsService", () => {
  let service: VariantsService;

  const mockVariant = {
    id: 1,
    sku: "TEST-001",
    name: "Test Variant",
    options: { color: "Red" },
    price: 29.99,
    dealerPrice: 19.99,
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

  describe("getVariantBySku", () => {
    it("should return variant with isPurchasable true when stock available", async () => {
      const result = await service.getVariantBySku("TEST-001", false);

      expect(result.sku).toBe("TEST-001");
      expect(result.price).toBe(29.99); // 普通用户价格
      expect(result.availableStock).toBe(8); // 10 - 2
      expect(result.isPurchasable).toBe(true);
    });

    it("should return dealer price when isDealer is true", async () => {
      const result = await service.getVariantBySku("TEST-001", true);

      expect(result.price).toBe(19.99); // 经销商价
    });

    it("should throw NotFoundException when variant not found", async () => {
      mockPrismaService.variant.findUnique.mockResolvedValueOnce(null);

      await expect(service.getVariantBySku("INVALID", false)).rejects.toThrow(
        'Variant with SKU "INVALID" not found',
      );
    });
  });

  describe("checkStock", () => {
    it("should return available true when stock sufficient", async () => {
      const result = await service.checkStock("TEST-001", 3);

      expect(result.available).toBe(true);
      expect(result.availableStock).toBe(8);
    });

    it("should return available false when stock insufficient", async () => {
      const result = await service.checkStock("TEST-001", 10);

      expect(result.available).toBe(false);
      expect(result.reason).toBe("Insufficient stock");
    });

    it("should return available false when product is deleted", async () => {
      mockPrismaService.variant.findUnique.mockResolvedValueOnce({
        ...mockVariant,
        product: { ...mockVariant.product, deletedAt: new Date() },
      });

      const result = await service.checkStock("TEST-001", 1);

      expect(result.available).toBe(false);
      expect(result.reason).toBe("Product is not available");
    });
  });
});
