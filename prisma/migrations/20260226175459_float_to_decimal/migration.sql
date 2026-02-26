/*
  Warnings:

  - You are about to alter the column `dailyPrice` on the `cabana_price_ranges` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `dailyPrice` on the `cabana_prices` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `price` on the `concept_prices` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `unitPrice` on the `extra_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `purchasePrice` on the `products` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `salePrice` on the `products` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.
  - You are about to alter the column `totalPrice` on the `reservations` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,2)`.

*/
-- AlterTable
ALTER TABLE "cabana_price_ranges" ALTER COLUMN "dailyPrice" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "cabana_prices" ALTER COLUMN "dailyPrice" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "concept_prices" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "extra_items" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "purchasePrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "salePrice" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "reservations" ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(10,2);
