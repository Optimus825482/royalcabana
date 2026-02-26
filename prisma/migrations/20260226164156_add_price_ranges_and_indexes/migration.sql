-- AlterTable
ALTER TABLE "cabana_classes" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "cabana_price_ranges" (
    "id" TEXT NOT NULL,
    "cabanaId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "dailyPrice" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cabana_price_ranges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cabana_price_ranges_cabanaId_startDate_endDate_idx" ON "cabana_price_ranges"("cabanaId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "cabana_price_ranges" ADD CONSTRAINT "cabana_price_ranges_cabanaId_fkey" FOREIGN KEY ("cabanaId") REFERENCES "cabanas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
