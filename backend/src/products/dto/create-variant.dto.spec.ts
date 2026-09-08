import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateVariantDto } from "./create-variant.dto";

const validInput = {
  productId: 1,
  sku: "BLOCK-50-STD",
  name: "Standard",
  price: 29.99,
};

describe("CreateVariantDto", () => {
  it("rejects fractional stock before it can reach the Prisma Int field", async () => {
    const dto = plainToInstance(CreateVariantDto, {
      ...validInput,
      stock: "1.5",
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === "stock")).toBe(true);
  });

  it("accepts a non-negative integer stock value", async () => {
    const dto = plainToInstance(CreateVariantDto, {
      ...validInput,
      stock: "2",
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });
});
