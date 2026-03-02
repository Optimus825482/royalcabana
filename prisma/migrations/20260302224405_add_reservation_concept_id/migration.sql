-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "conceptId" TEXT;

-- CreateIndex
CREATE INDEX "reservations_conceptId_idx" ON "reservations"("conceptId");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
