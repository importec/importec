-- CreateTable
CREATE TABLE "VapeProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flavor" TEXT,
    "cost" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VapeProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VapeSeller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VapeSeller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VapeSellerStock" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VapeSellerStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VapeSellerStock_sellerId_productId_key" ON "VapeSellerStock"("sellerId", "productId");

-- AddForeignKey
ALTER TABLE "VapeSellerStock" ADD CONSTRAINT "VapeSellerStock_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "VapeSeller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VapeSellerStock" ADD CONSTRAINT "VapeSellerStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "VapeProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
