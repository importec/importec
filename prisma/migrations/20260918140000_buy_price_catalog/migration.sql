-- CreateTable
CREATE TABLE "BuyPriceCatalog" (
    "id" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'Apple',
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "storageGb" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "sealedPrice" DECIMAL(12,2),
    "likeNewPrice" DECIMAL(12,2),
    "goodPrice" DECIMAL(12,2),
    "fairPrice" DECIMAL(12,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyPriceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuyPriceCatalog_category_brand_model_idx" ON "BuyPriceCatalog"("category", "brand", "model");
