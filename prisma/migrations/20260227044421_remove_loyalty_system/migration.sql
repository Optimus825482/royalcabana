/*
  Warnings:

  - You are about to drop the column `totalLoyaltyPoints` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `loyalty_transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "loyalty_transactions" DROP CONSTRAINT "loyalty_transactions_userId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "totalLoyaltyPoints";

-- DropTable
DROP TABLE "loyalty_transactions";

-- DropEnum
DROP TYPE "LoyaltyType";
