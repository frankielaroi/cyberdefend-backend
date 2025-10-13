/*
  Warnings:

  - The values [ACTIVE] on the enum `CampaignStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [DATA_SUBMITTED,EMAIL_REPORTED] on the enum `PhishingEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `clickedCount` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `deliveredCount` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `openedCount` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `reportedCount` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `phishing_targets` table. All the data in the column will be lost.
  - You are about to drop the column `trackingId` on the `phishing_targets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[campaignId,email]` on the table `phishing_targets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdBy` to the `phishing_campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateId` to the `phishing_campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `phishing_targets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('SECURITY', 'HR', 'FINANCE', 'IT', 'EXECUTIVE', 'GENERAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "CampaignStatus_new" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "phishing_campaigns" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "phishing_campaigns" ALTER COLUMN "status" TYPE "CampaignStatus_new" USING ("status"::text::"CampaignStatus_new");
ALTER TYPE "CampaignStatus" RENAME TO "CampaignStatus_old";
ALTER TYPE "CampaignStatus_new" RENAME TO "CampaignStatus";
DROP TYPE "CampaignStatus_old";
ALTER TABLE "phishing_campaigns" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PhishingEventType_new" AS ENUM ('EMAIL_QUEUED', 'EMAIL_SENT', 'EMAIL_DELIVERED', 'EMAIL_BOUNCED', 'EMAIL_OPENED', 'LINK_CLICKED', 'CREDENTIALS_ENTERED', 'PHISHING_REPORTED', 'CAMPAIGN_STARTED', 'CAMPAIGN_PAUSED', 'CAMPAIGN_RESUMED', 'CAMPAIGN_COMPLETED', 'CAMPAIGN_CANCELLED');
ALTER TABLE "phishing_events" ALTER COLUMN "type" TYPE "PhishingEventType_new" USING ("type"::text::"PhishingEventType_new");
ALTER TYPE "PhishingEventType" RENAME TO "PhishingEventType_old";
ALTER TYPE "PhishingEventType_new" RENAME TO "PhishingEventType";
DROP TYPE "PhishingEventType_old";
COMMIT;

-- DropIndex
DROP INDEX "phishing_targets_trackingId_key";

-- AlterTable
ALTER TABLE "phishing_campaigns" DROP COLUMN "clickedCount",
DROP COLUMN "deliveredCount",
DROP COLUMN "openedCount",
DROP COLUMN "reportedCount",
DROP COLUMN "startedAt",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "credentialsEntered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailsBounced" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailsDelivered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailsOpened" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailsSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "launchedAt" TIMESTAMP(3),
ADD COLUMN     "linksClicked" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "phishingReported" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "templateId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "phishing_events" ADD COLUMN     "location" TEXT,
ALTER COLUMN "targetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "phishing_targets" DROP COLUMN "status",
DROP COLUMN "trackingId",
ADD COLUMN     "bouncedAt" TIMESTAMP(3),
ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "credentialsAt" TIMESTAMP(3),
ADD COLUMN     "credentialsEntered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailBounced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailDelivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailOpened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "linkClicked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportedPhishing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "riskScore" DOUBLE PRECISION,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userAgent" TEXT;

-- DropEnum
DROP TYPE "TargetStatus";

-- CreateTable
CREATE TABLE "phishing_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "defaultSubject" TEXT NOT NULL,
    "defaultSenderName" TEXT NOT NULL,
    "emailBodyHtml" TEXT NOT NULL,
    "emailBodyText" TEXT NOT NULL,
    "landingPageHtml" TEXT,
    "captureCredentials" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "previewContent" TEXT NOT NULL,
    "tags" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "createdBy" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phishing_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_jobs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "priority" "JobPriority" NOT NULL DEFAULT 'MEDIUM',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "processingData" TEXT,
    "errorMessage" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phishing_templates_name_key" ON "phishing_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "phishing_targets_campaignId_email_key" ON "phishing_targets"("campaignId", "email");

-- AddForeignKey
ALTER TABLE "phishing_campaigns" ADD CONSTRAINT "phishing_campaigns_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phishing_templates" ADD CONSTRAINT "phishing_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phishing_templates" ADD CONSTRAINT "phishing_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
