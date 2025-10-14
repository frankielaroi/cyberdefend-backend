/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `assessments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_userId_fkey";

-- AlterTable
ALTER TABLE "assessment_responses" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "transferredToUserId" TEXT,
ALTER COLUMN "organizationId" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "assessment_responses_sessionId_idx" ON "assessment_responses"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_sessionId_key" ON "assessments"("sessionId");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_transferredToUserId_fkey" FOREIGN KEY ("transferredToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
