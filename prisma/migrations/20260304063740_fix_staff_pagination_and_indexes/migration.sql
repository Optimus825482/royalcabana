-- CreateIndex
CREATE INDEX "staff_assignments_staffId_date_idx" ON "staff_assignments"("staffId", "date");

-- CreateIndex
CREATE INDEX "staff_assignments_cabanaId_date_idx" ON "staff_assignments"("cabanaId", "date");
