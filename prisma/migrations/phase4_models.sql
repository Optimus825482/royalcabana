-- Phase 4: Review, LoyaltyTransaction models + User field additions
-- Run manually: psql -d your_db -f prisma/migrations/phase4_models.sql

-- ===== ENUMS =====

CREATE TYPE "LoyaltyType" AS ENUM (
  'EARN_RESERVATION',
  'EARN_FNB',
  'EARN_REVIEW',
  'REDEEM',
  'ADMIN_ADJUST'
);

-- ===== USER FIELD ADDITIONS =====

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalLoyaltyPoints" INTEGER NOT NULL DEFAULT 0;

-- ===== REVIEWS TABLE =====

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "reviews_reservationId_key" ON "reviews"("reservationId");
CREATE INDEX IF NOT EXISTS "reviews_userId_idx" ON "reviews"("userId");
CREATE INDEX IF NOT EXISTS "reviews_rating_idx" ON "reviews"("rating");

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_reservationId_fkey"
  FOREIGN KEY ("reservationId") REFERENCES "reservations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===== LOYALTY TRANSACTIONS TABLE =====

CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "type" "LoyaltyType" NOT NULL,
  "description" TEXT NOT NULL,
  "referenceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "loyalty_transactions_userId_idx" ON "loyalty_transactions"("userId");
CREATE INDEX IF NOT EXISTS "loyalty_transactions_type_idx" ON "loyalty_transactions"("type");

ALTER TABLE "loyalty_transactions"
  ADD CONSTRAINT "loyalty_transactions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
