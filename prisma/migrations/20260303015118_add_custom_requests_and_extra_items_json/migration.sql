-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "customRequestPrice" DECIMAL(10,2),
ADD COLUMN     "customRequestPriced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customRequests" TEXT,
ADD COLUMN     "extraItems_json" JSONB;
