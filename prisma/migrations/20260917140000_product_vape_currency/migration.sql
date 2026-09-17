-- AlterTable
ALTER TABLE "Product" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "VapeProduct" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'USD';
