-- CreateEnum
CREATE TYPE "VipLevel" AS ENUM ('STANDARD', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "FnbOrderStatus" AS ENUM ('PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CHECK_IN';
ALTER TYPE "NotificationType" ADD VALUE 'CHECK_OUT';
ALTER TYPE "NotificationType" ADD VALUE 'FNB_ORDER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReservationStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "ReservationStatus" ADD VALUE 'CHECKED_OUT';

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "checkInAt" TIMESTAMP(3),
ADD COLUMN     "checkOutAt" TIMESTAMP(3),
ADD COLUMN     "checkedInBy" TEXT,
ADD COLUMN     "checkedOutBy" TEXT,
ADD COLUMN     "guestId" TEXT;

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "vipLevel" "VipLevel" NOT NULL DEFAULT 'STANDARD',
    "notes" TEXT,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_orders" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "cabanaId" TEXT NOT NULL,
    "status" "FnbOrderStatus" NOT NULL DEFAULT 'PREPARING',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fnb_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fnb_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "fnb_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guests_name_idx" ON "guests"("name");

-- CreateIndex
CREATE INDEX "guests_phone_idx" ON "guests"("phone");

-- CreateIndex
CREATE INDEX "guests_isBlacklisted_idx" ON "guests"("isBlacklisted");

-- CreateIndex
CREATE INDEX "guests_deletedAt_idx" ON "guests"("deletedAt");

-- CreateIndex
CREATE INDEX "fnb_orders_reservationId_idx" ON "fnb_orders"("reservationId");

-- CreateIndex
CREATE INDEX "fnb_orders_cabanaId_idx" ON "fnb_orders"("cabanaId");

-- CreateIndex
CREATE INDEX "fnb_orders_status_idx" ON "fnb_orders"("status");

-- CreateIndex
CREATE INDEX "fnb_orders_createdAt_idx" ON "fnb_orders"("createdAt");

-- CreateIndex
CREATE INDEX "fnb_order_items_orderId_idx" ON "fnb_order_items"("orderId");

-- CreateIndex
CREATE INDEX "reservations_guestId_idx" ON "reservations"("guestId");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_orders" ADD CONSTRAINT "fnb_orders_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_orders" ADD CONSTRAINT "fnb_orders_cabanaId_fkey" FOREIGN KEY ("cabanaId") REFERENCES "cabanas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_order_items" ADD CONSTRAINT "fnb_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "fnb_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fnb_order_items" ADD CONSTRAINT "fnb_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
