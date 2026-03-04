-- CreateTable
CREATE TABLE "concept_extra_services" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "extraServiceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "concept_extra_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "concept_extra_services_conceptId_idx" ON "concept_extra_services"("conceptId");

-- CreateIndex
CREATE UNIQUE INDEX "concept_extra_services_conceptId_extraServiceId_key" ON "concept_extra_services"("conceptId", "extraServiceId");

-- AddForeignKey
ALTER TABLE "concept_extra_services" ADD CONSTRAINT "concept_extra_services_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_extra_services" ADD CONSTRAINT "concept_extra_services_extraServiceId_fkey" FOREIGN KEY ("extraServiceId") REFERENCES "extra_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
