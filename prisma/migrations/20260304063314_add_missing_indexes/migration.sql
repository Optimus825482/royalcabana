-- DropIndex
DROP INDEX "reservations_status_deletedAt_startDate_idx";

-- CreateIndex
CREATE INDEX "fnb_orders_createdBy_idx" ON "fnb_orders"("createdBy");

-- CreateIndex
CREATE INDEX "guests_email_idx" ON "guests"("email");

-- CreateIndex
CREATE INDEX "reservations_status_startDate_idx" ON "reservations"("status", "startDate");

-- CreateIndex
CREATE INDEX "staff_email_idx" ON "staff"("email");
