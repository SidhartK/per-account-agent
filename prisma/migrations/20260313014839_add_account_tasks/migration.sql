-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'completed', 'cleared');

-- CreateTable
CREATE TABLE "AccountTask" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rationale" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "clearReason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AccountTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountTask_accountId_status_idx" ON "AccountTask"("accountId", "status");

-- AddForeignKey
ALTER TABLE "AccountTask" ADD CONSTRAINT "AccountTask_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
