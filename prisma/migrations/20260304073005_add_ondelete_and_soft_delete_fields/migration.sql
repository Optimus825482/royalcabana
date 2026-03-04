-- AlterEnum
ALTER TYPE "CabanaStatus" ADD VALUE 'OCCUPIED';

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "concept_extra_services" DROP CONSTRAINT "concept_extra_services_extraServiceId_fkey";

-- DropForeignKey
ALTER TABLE "concept_products" DROP CONSTRAINT "concept_products_productId_fkey";

-- DropForeignKey
ALTER TABLE "login_sessions" DROP CONSTRAINT "login_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "waitlist_entries" DROP CONSTRAINT "waitlist_entries_userId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cabanas" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "task_definitions" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "cabanas_isDeleted_idx" ON "cabanas"("isDeleted");

-- CreateIndex
CREATE INDEX "guests_isDeleted_idx" ON "guests"("isDeleted");

-- CreateIndex
CREATE INDEX "products_isDeleted_idx" ON "products"("isDeleted");

-- CreateIndex
CREATE INDEX "reservations_isDeleted_idx" ON "reservations"("isDeleted");

-- CreateIndex
CREATE INDEX "staff_isDeleted_idx" ON "staff"("isDeleted");

-- CreateIndex
CREATE INDEX "task_definitions_isDeleted_idx" ON "task_definitions"("isDeleted");

-- CreateIndex
CREATE INDEX "users_isDeleted_idx" ON "users"("isDeleted");

-- AddForeignKey
ALTER TABLE "concept_products" ADD CONSTRAINT "concept_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_extra_services" ADD CONSTRAINT "concept_extra_services_extraServiceId_fkey" FOREIGN KEY ("extraServiceId") REFERENCES "extra_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
