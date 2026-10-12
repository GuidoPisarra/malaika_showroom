-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "fromHeader" TEXT NOT NULL,
    "replyTo" TEXT,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_tenantId_createdAt_idx" ON "EmailLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_tenantId_orderId_idx" ON "EmailLog"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "EmailLog_status_attempts_idx" ON "EmailLog"("status", "attempts");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_tenantId_dedupeKey_key" ON "EmailLog"("tenantId", "dedupeKey");
