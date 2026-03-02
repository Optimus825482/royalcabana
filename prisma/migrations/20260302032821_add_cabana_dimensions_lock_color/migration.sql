-- AlterTable: Replace scale with scaleX/scaleY, add color and isLocked
ALTER TABLE "cabanas" ADD COLUMN "scaleX" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "cabanas" ADD COLUMN "scaleY" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "cabanas" ADD COLUMN "color" TEXT;
ALTER TABLE "cabanas" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing scale data to scaleX and scaleY
UPDATE "cabanas" SET "scaleX" = "scale", "scaleY" = "scale" WHERE "scale" IS NOT NULL;

-- Drop old scale column
ALTER TABLE "cabanas" DROP COLUMN "scale";
