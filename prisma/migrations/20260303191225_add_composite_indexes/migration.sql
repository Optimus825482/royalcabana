-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "reservations_status_deletedAt_startDate_idx" ON "reservations"("status", "deletedAt", "startDate");
