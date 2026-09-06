-- AlterTable
-- Add an immutable SKU snapshot to OrderItem so historical orders keep the
-- SKU even if the variant is later renamed or re-keyed.
ALTER TABLE "OrderItem" ADD COLUMN "sku" TEXT;

-- Backfill any pre-existing order items before making the column required.
UPDATE "OrderItem" SET "sku" = '' WHERE "sku" IS NULL;

ALTER TABLE "OrderItem" ALTER COLUMN "sku" SET NOT NULL;