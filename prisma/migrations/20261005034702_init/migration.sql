-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUTTING_SUPERVISOR', 'CUTTING_VERIFIER', 'SEWING_SUPERVISOR');

-- CreateEnum
CREATE TYPE "CuttingOrderStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'IN_SEWING');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "recipeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stdFabricYards" DOUBLE PRECISION NOT NULL,
    "wastageCap" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeComponent" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "componentName" TEXT NOT NULL,
    "piecesPerGarment" INTEGER NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "RecipeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuttingOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "targetQty" INTEGER NOT NULL,
    "fabricRollId" TEXT NOT NULL,
    "actualFabricYds" DOUBLE PRECISION NOT NULL,
    "status" "CuttingOrderStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuttingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "actualQty" INTEGER,
    "status" "VerificationStatus",

    CONSTRAINT "VerificationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "decision" "VerificationDecision" NOT NULL,
    "rejectionNote" TEXT,
    "wastagePct" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_recipeCode_key" ON "Recipe"("recipeCode");

-- CreateIndex
CREATE INDEX "Recipe_category_idx" ON "Recipe"("category");

-- CreateIndex
CREATE INDEX "Recipe_name_idx" ON "Recipe"("name");

-- CreateIndex
CREATE INDEX "Recipe_createdAt_idx" ON "Recipe"("createdAt");

-- CreateIndex
CREATE INDEX "RecipeComponent_recipeId_idx" ON "RecipeComponent"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeComponent_componentName_idx" ON "RecipeComponent"("componentName");

-- CreateIndex
CREATE UNIQUE INDEX "CuttingOrder_orderNo_key" ON "CuttingOrder"("orderNo");

-- CreateIndex
CREATE INDEX "CuttingOrder_recipeId_idx" ON "CuttingOrder"("recipeId");

-- CreateIndex
CREATE INDEX "CuttingOrder_createdBy_idx" ON "CuttingOrder"("createdBy");

-- CreateIndex
CREATE INDEX "CuttingOrder_status_idx" ON "CuttingOrder"("status");

-- CreateIndex
CREATE INDEX "CuttingOrder_fabricRollId_idx" ON "CuttingOrder"("fabricRollId");

-- CreateIndex
CREATE INDEX "CuttingOrder_createdAt_idx" ON "CuttingOrder"("createdAt");

-- CreateIndex
CREATE INDEX "CuttingOrder_status_createdAt_idx" ON "CuttingOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VerificationItem_orderId_idx" ON "VerificationItem"("orderId");

-- CreateIndex
CREATE INDEX "VerificationItem_componentId_idx" ON "VerificationItem"("componentId");

-- CreateIndex
CREATE INDEX "VerificationItem_status_idx" ON "VerificationItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationItem_orderId_componentId_key" ON "VerificationItem"("orderId", "componentId");

-- CreateIndex
CREATE INDEX "VerificationLog_orderId_idx" ON "VerificationLog"("orderId");

-- CreateIndex
CREATE INDEX "VerificationLog_verifierId_idx" ON "VerificationLog"("verifierId");

-- CreateIndex
CREATE INDEX "VerificationLog_decision_idx" ON "VerificationLog"("decision");

-- CreateIndex
CREATE INDEX "VerificationLog_timestamp_idx" ON "VerificationLog"("timestamp");

-- CreateIndex
CREATE INDEX "VerificationLog_orderId_timestamp_idx" ON "VerificationLog"("orderId", "timestamp");

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingOrder" ADD CONSTRAINT "CuttingOrder_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuttingOrder" ADD CONSTRAINT "CuttingOrder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationItem" ADD CONSTRAINT "VerificationItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CuttingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationItem" ADD CONSTRAINT "VerificationItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "RecipeComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CuttingOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationLog" ADD CONSTRAINT "VerificationLog_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
