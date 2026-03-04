/*
  Warnings:

  - You are about to drop the column `dailyPrice` on the `cabanas` table. All the data in the column will be lost.
  - You are about to drop the `cabana_price_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cabana_price_ranges` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cabana_prices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `concept_price_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `concept_prices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_price_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "cabana_price_ranges" DROP CONSTRAINT "cabana_price_ranges_cabanaId_fkey";

-- DropForeignKey
ALTER TABLE "cabana_prices" DROP CONSTRAINT "cabana_prices_cabanaId_fkey";

-- DropForeignKey
ALTER TABLE "concept_prices" DROP CONSTRAINT "concept_prices_conceptId_fkey";

-- DropForeignKey
ALTER TABLE "concept_prices" DROP CONSTRAINT "concept_prices_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_price_history" DROP CONSTRAINT "product_price_history_productId_fkey";

-- AlterTable
ALTER TABLE "cabanas" DROP COLUMN "dailyPrice";

-- DropTable
DROP TABLE "cabana_price_history";

-- DropTable
DROP TABLE "cabana_price_ranges";

-- DropTable
DROP TABLE "cabana_prices";

-- DropTable
DROP TABLE "concept_price_history";

-- DropTable
DROP TABLE "concept_prices";

-- DropTable
DROP TABLE "product_price_history";
