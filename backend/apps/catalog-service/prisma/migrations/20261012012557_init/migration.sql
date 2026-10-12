-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RESERVE', 'RELEASE', 'ADJUST');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "category" TEXT NOT NULL,
    "slot" TEXT NOT NULL DEFAULT 'accessory',
    "image" TEXT NOT NULL,
    "gallery" TEXT[],
    "colors" JSONB NOT NULL DEFAULT '[]',
    "sizes" TEXT[],
    "material" TEXT NOT NULL DEFAULT '',
    "occasion" TEXT NOT NULL DEFAULT 'casual',
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "details" TEXT[],
    "stock" INTEGER NOT NULL DEFAULT 0,
    "silhouette" JSONB,
    "arModelType" TEXT,
    "arScale" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LookPreset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "tag" TEXT NOT NULL DEFAULT '',
    "imagePreview" TEXT NOT NULL,
    "itemIds" TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LookPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowroomZone" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ambianceTitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "bgGradient" TEXT NOT NULL DEFAULT '',
    "accentColor" TEXT NOT NULL DEFAULT '#D4AF37',
    "panoramicImage" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowroomZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowroomHotspot" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "xPercent" DOUBLE PRECISION NOT NULL,
    "yPercent" DOUBLE PRECISION NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "standType" TEXT NOT NULL DEFAULT 'perchero-dorado',
    "rotationY" DOUBLE PRECISION,

    CONSTRAINT "ShowroomHotspot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedLook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedLook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_tenantId_active_category_idx" ON "Product"("tenantId", "active", "category");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_orderId_idx" ON "StockMovement"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "LookPreset_tenantId_idx" ON "LookPreset"("tenantId");

-- CreateIndex
CREATE INDEX "ShowroomZone_tenantId_idx" ON "ShowroomZone"("tenantId");

-- CreateIndex
CREATE INDEX "SavedLook_tenantId_userId_idx" ON "SavedLook"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "ShowroomHotspot" ADD CONSTRAINT "ShowroomHotspot_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShowroomZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
