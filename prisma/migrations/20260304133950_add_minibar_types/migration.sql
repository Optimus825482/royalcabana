-- AlterTable
ALTER TABLE "cabanas" ADD COLUMN     "minibarTypeId" TEXT;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "minibarTypeId" TEXT;

-- CreateTable
CREATE TABLE "minibar_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "minibar_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minibar_type_products" (
    "id" TEXT NOT NULL,
    "minibarTypeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "minibar_type_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "minibar_types_name_key" ON "minibar_types"("name");

-- CreateIndex
CREATE INDEX "minibar_types_isActive_idx" ON "minibar_types"("isActive");

-- CreateIndex
CREATE INDEX "minibar_types_isDeleted_idx" ON "minibar_types"("isDeleted");

-- CreateIndex
CREATE INDEX "minibar_type_products_minibarTypeId_idx" ON "minibar_type_products"("minibarTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "minibar_type_products_minibarTypeId_productId_key" ON "minibar_type_products"("minibarTypeId", "productId");

-- CreateIndex
CREATE INDEX "cabanas_minibarTypeId_idx" ON "cabanas"("minibarTypeId");

-- AddForeignKey
ALTER TABLE "cabanas" ADD CONSTRAINT "cabanas_minibarTypeId_fkey" FOREIGN KEY ("minibarTypeId") REFERENCES "minibar_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_minibarTypeId_fkey" FOREIGN KEY ("minibarTypeId") REFERENCES "minibar_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minibar_type_products" ADD CONSTRAINT "minibar_type_products_minibarTypeId_fkey" FOREIGN KEY ("minibarTypeId") REFERENCES "minibar_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "minibar_type_products" ADD CONSTRAINT "minibar_type_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
