-- AlterTable
-- Add an immutable SKU snapshot to OrderItem so historical orders keep the
-- SKU even if the variant is later renamed or re-keyed.
ALTER TABLE "OrderItem" ADD COLUMN "sku" TEXT;

-- Backfill any pre-existing order items from the matching Variant.sku so the
-- snapshot reflects the real SKU rather than an empty string.
UPDATE "OrderItem"
SET "sku" = "Variant"."sku"
FROM "Variant"
WHERE "OrderItem"."variantId" = "Variant"."id";

-- Fallback for orphaned order items whose variant no longer exists.
UPDATE "OrderItem" SET "sku" = '' WHERE "sku" IS NULL;

ALTER TABLE "OrderItem" ALTER COLUMN "sku" SET NOT NULL;