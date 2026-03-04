-- AlterTable
ALTER TABLE "service_points" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiredStaffCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "staffRoles" JSONB;

-- CreateTable
CREATE TABLE "service_point_staff" (
    "id" TEXT NOT NULL,
    "servicePointId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "shift" TEXT,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_point_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_point_staff_servicePointId_idx" ON "service_point_staff"("servicePointId");

-- CreateIndex
CREATE INDEX "service_point_staff_staffId_idx" ON "service_point_staff"("staffId");

-- CreateIndex
CREATE INDEX "service_point_staff_date_idx" ON "service_point_staff"("date");

-- CreateIndex
CREATE UNIQUE INDEX "service_point_staff_servicePointId_staffId_date_role_key" ON "service_point_staff"("servicePointId", "staffId", "date", "role");

-- AddForeignKey
ALTER TABLE "service_point_staff" ADD CONSTRAINT "service_point_staff_servicePointId_fkey" FOREIGN KEY ("servicePointId") REFERENCES "service_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_point_staff" ADD CONSTRAINT "service_point_staff_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
