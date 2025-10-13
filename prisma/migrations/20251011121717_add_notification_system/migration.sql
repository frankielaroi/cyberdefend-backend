-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('EMAIL', 'SMS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PhishingEventType" ADD VALUE 'SMS_QUEUED';
ALTER TYPE "PhishingEventType" ADD VALUE 'SMS_SENT';
ALTER TYPE "PhishingEventType" ADD VALUE 'SMS_DELIVERED';
ALTER TYPE "PhishingEventType" ADD VALUE 'SMS_FAILED';
ALTER TYPE "PhishingEventType" ADD VALUE 'SMS_CLICKED';

-- AlterTable
ALTER TABLE "phishing_campaigns" ADD COLUMN     "campaignType" "CampaignType" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "messageContent" TEXT,
ADD COLUMN     "messagesDelivered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messagesFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messagesOpened" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "messagesSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "senderNumber" TEXT,
ADD COLUMN     "trackingUrl" TEXT,
ALTER COLUMN "subject" DROP NOT NULL,
ALTER COLUMN "senderName" DROP NOT NULL,
ALTER COLUMN "senderEmail" DROP NOT NULL;

-- AlterTable
ALTER TABLE "phishing_targets" ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "messageDelivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageFailed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "messageOpened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "smsProvider" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "phishing_templates" ADD COLUMN     "defaultSenderNumber" TEXT,
ADD COLUMN     "messageContent" TEXT,
ADD COLUMN     "smsContent" TEXT,
ADD COLUMN     "templateType" "TemplateType" NOT NULL DEFAULT 'EMAIL',
ALTER COLUMN "defaultSubject" DROP NOT NULL,
ALTER COLUMN "defaultSenderName" DROP NOT NULL,
ALTER COLUMN "emailBodyHtml" DROP NOT NULL,
ALTER COLUMN "emailBodyText" DROP NOT NULL;
