import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { VariantsController } from "./variants.controller";
import {
  VariantsService,
  VARIANT_DELETE_REFERENCE_CONFLICT_MESSAGE,
} from "./variants.service";

describe("VariantsController", () => {
  let controller: VariantsController;

  const mockVariantsService = {
    deleteVariant: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockVariantsService.deleteVariant.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariantsController],
      providers: [{ provide: VariantsService, useValue: mockVariantsService }],
    }).compile();

    controller = module.get<VariantsController>(VariantsController);
  });

  it("deletes an unreferenced SKU", async () => {
    await expect(controller.deleteVariant(7)).resolves.toEqual({
      message: "Variant deleted successfully",
    });
    expect(mockVariantsService.deleteVariant).toHaveBeenCalledWith(7);
  });

  it("preserves a service 404 for a missing SKU", async () => {
    const error = new NotFoundException("Variant with id 999 not found");
    mockVariantsService.deleteVariant.mockRejectedValueOnce(error);

    await expect(controller.deleteVariant(999)).rejects.toBe(error);
  });

  it("preserves the deletion conflict guidance for referenced SKUs", async () => {
    const error = new ConflictException(
      VARIANT_DELETE_REFERENCE_CONFLICT_MESSAGE,
    );
    mockVariantsService.deleteVariant.mockRejectedValueOnce(error);

    await expect(controller.deleteVariant(7)).rejects.toBe(error);
  });
});
