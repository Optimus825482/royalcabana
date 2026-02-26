-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "cancellation_requests_reservationId_idx" ON "cancellation_requests"("reservationId");

-- CreateIndex
CREATE INDEX "concept_products_conceptId_idx" ON "concept_products"("conceptId");

-- CreateIndex
CREATE INDEX "extra_concept_requests_reservationId_idx" ON "extra_concept_requests"("reservationId");

-- CreateIndex
CREATE INDEX "extra_items_reservationId_idx" ON "extra_items"("reservationId");

-- CreateIndex
CREATE INDEX "modification_requests_reservationId_idx" ON "modification_requests"("reservationId");

-- CreateIndex
CREATE INDEX "reservation_status_history_reservationId_idx" ON "reservation_status_history"("reservationId");
