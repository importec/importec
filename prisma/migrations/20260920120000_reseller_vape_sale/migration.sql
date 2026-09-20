-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "resellerName" TEXT;

-- AlterEnum
ALTER TYPE "CashMovementSource" ADD VALUE 'VAPE_SALE';
