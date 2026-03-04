-- AlterTable
ALTER TABLE "blackout_dates" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "cabana_classes" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "concepts" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product_groups" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "blackout_dates_isDeleted_idx" ON "blackout_dates"("isDeleted");

-- CreateIndex
CREATE INDEX "cabana_classes_isDeleted_idx" ON "cabana_classes"("isDeleted");

-- CreateIndex
CREATE INDEX "concepts_name_idx" ON "concepts"("name");

-- CreateIndex
CREATE INDEX "concepts_isDeleted_idx" ON "concepts"("isDeleted");

-- CreateIndex
CREATE INDEX "notifications_isDeleted_idx" ON "notifications"("isDeleted");

-- CreateIndex
CREATE INDEX "product_groups_isDeleted_idx" ON "product_groups"("isDeleted");

-- CreateIndex
CREATE INDEX "reviews_isDeleted_idx" ON "reviews"("isDeleted");
