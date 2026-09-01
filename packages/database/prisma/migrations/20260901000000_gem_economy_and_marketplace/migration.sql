-- CreateEnum
CREATE TYPE "GemSource" AS ENUM ('DAILY_CHECK_IN', 'QUEST_REWARD', 'LEVEL_UP', 'ACHIEVEMENT_UNLOCK', 'MARKETPLACE_PURCHASE', 'ADMIN_ADJUSTMENT', 'REFUND');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "equippedItems" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "gemBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "gem_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "resultingBalance" INTEGER NOT NULL,
    "source" "GemSource" NOT NULL,
    "metadata" JSONB,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gem_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_ownerships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stellarAssetId" TEXT,
    "stellarTxHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "item_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gem_transactions_userId_createdAt_idx" ON "gem_transactions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "gem_transactions_userId_idempotencyKey_key" ON "gem_transactions"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "item_ownerships_userId_itemId_key" ON "item_ownerships"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "gem_transactions" ADD CONSTRAINT "gem_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_ownerships" ADD CONSTRAINT "item_ownerships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

