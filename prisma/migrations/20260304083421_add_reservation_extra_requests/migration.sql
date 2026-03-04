-- CreateEnum
CREATE TYPE "ExtraRequestType" AS ENUM ('PRODUCT', 'CUSTOM');

-- CreateTable
CREATE TABLE "reservation_extra_requests" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" "ExtraRequestType" NOT NULL,
    "productId" TEXT,
    "customName" TEXT,
    "customDesc" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2),
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "pricedBy" TEXT,
    "pricedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_extra_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservation_extra_requests_reservationId_idx" ON "reservation_extra_requests"("reservationId");

-- CreateIndex
CREATE INDEX "reservation_extra_requests_reservationId_status_idx" ON "reservation_extra_requests"("reservationId", "status");

-- CreateIndex
CREATE INDEX "reservation_extra_requests_status_idx" ON "reservation_extra_requests"("status");

-- AddForeignKey
ALTER TABLE "reservation_extra_requests" ADD CONSTRAINT "reservation_extra_requests_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_extra_requests" ADD CONSTRAINT "reservation_extra_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
