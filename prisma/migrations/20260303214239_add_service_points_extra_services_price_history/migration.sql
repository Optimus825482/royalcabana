-- CreateTable
CREATE TABLE "service_points" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "coordX" DOUBLE PRECISION,
    "coordY" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extra_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra_service_prices" (
    "id" TEXT NOT NULL,
    "extraServiceId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extra_service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabana_price_history" (
    "id" TEXT NOT NULL,
    "cabanaId" TEXT NOT NULL,
    "dailyPrice" DECIMAL(10,2) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cabana_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_price_history" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "productId" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concept_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_points_name_key" ON "service_points"("name");

-- CreateIndex
CREATE INDEX "service_points_type_idx" ON "service_points"("type");

-- CreateIndex
CREATE INDEX "service_points_isActive_idx" ON "service_points"("isActive");

-- CreateIndex
CREATE INDEX "service_points_isDeleted_idx" ON "service_points"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "extra_services_name_key" ON "extra_services"("name");

-- CreateIndex
CREATE INDEX "extra_services_category_idx" ON "extra_services"("category");

-- CreateIndex
CREATE INDEX "extra_services_isActive_idx" ON "extra_services"("isActive");

-- CreateIndex
CREATE INDEX "extra_services_isDeleted_idx" ON "extra_services"("isDeleted");

-- CreateIndex
CREATE INDEX "extra_service_prices_extraServiceId_effectiveFrom_idx" ON "extra_service_prices"("extraServiceId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "cabana_price_history_cabanaId_createdAt_idx" ON "cabana_price_history"("cabanaId", "createdAt");

-- CreateIndex
CREATE INDEX "concept_price_history_conceptId_createdAt_idx" ON "concept_price_history"("conceptId", "createdAt");

-- AddForeignKey
ALTER TABLE "extra_service_prices" ADD CONSTRAINT "extra_service_prices_extraServiceId_fkey" FOREIGN KEY ("extraServiceId") REFERENCES "extra_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
