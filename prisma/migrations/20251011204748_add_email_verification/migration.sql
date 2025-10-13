/*
  Warnings:

  - The values [SMS_QUEUED,SMS_SENT,SMS_DELIVERED,SMS_FAILED,SMS_CLICKED] on the enum `PhishingEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `campaignType` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `messageContent` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `messagesDelivered` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `messagesFailed` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `messagesOpened` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `messagesSent` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `senderNumber` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `trackingUrl` on the `phishing_campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `failedAt` on the `phishing_targets` table. All the data in the column will be lost.
  - You are about to drop the column `messageDelivered` on the `phishing_targets` table. All the data in the column will be lost.
  - You are about to drop the column `messageFailed` on the `phishing_targets` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `phishing_targets` table. All the data in the column will be lost.
  - You are about to drop the column `messageOpened` on the `phishing_targets` table. All the data in the column will be lost.
  - You are about to drop the column `messageSent` on the `phishing_targets` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `phishing_targets` table. All the data in the column will be lost.
  - You are about to drop the column `smsProvider` on the `phishing_targets` table. All the data in the column will be lost.
  - You are about to drop the column `defaultSenderNumber` on the `phishing_templates` table. All the data in the column will be lost.
  - You are about to drop the column `messageContent` on the `phishing_templates` table. All the data in the column will be lost.
  - You are about to drop the column `smsContent` on the `phishing_templates` table. All the data in the column will be lost.
  - You are about to drop the column `templateType` on the `phishing_templates` table. All the data in the column will be lost.
  - Made the column `subject` on table `phishing_campaigns` required. This step will fail if there are existing NULL values in that column.
  - Made the column `senderName` on table `phishing_campaigns` required. This step will fail if there are existing NULL values in that column.
  - Made the column `senderEmail` on table `phishing_campaigns` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `phishing_targets` required. This step will fail if there are existing NULL values in that column.
  - Made the column `defaultSubject` on table `phishing_templates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `defaultSenderName` on table `phishing_templates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `emailBodyHtml` on table `phishing_templates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `emailBodyText` on table `phishing_templates` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PhishingEventType_new" AS ENUM ('EMAIL_QUEUED', 'EMAIL_SENT', 'EMAIL_DELIVERED', 'EMAIL_BOUNCED', 'EMAIL_OPENED', 'LINK_CLICKED', 'CREDENTIALS_ENTERED', 'PHISHING_REPORTED', 'CAMPAIGN_STARTED', 'CAMPAIGN_PAUSED', 'CAMPAIGN_RESUMED', 'CAMPAIGN_COMPLETED', 'CAMPAIGN_CANCELLED');
ALTER TABLE "phishing_events" ALTER COLUMN "type" TYPE "PhishingEventType_new" USING ("type"::text::"PhishingEventType_new");
ALTER TYPE "PhishingEventType" RENAME TO "PhishingEventType_old";
ALTER TYPE "PhishingEventType_new" RENAME TO "PhishingEventType";
DROP TYPE "PhishingEventType_old";
COMMIT;

-- AlterTable
ALTER TABLE "phishing_campaigns" DROP COLUMN "campaignType",
DROP COLUMN "messageContent",
DROP COLUMN "messagesDelivered",
DROP COLUMN "messagesFailed",
DROP COLUMN "messagesOpened",
DROP COLUMN "messagesSent",
DROP COLUMN "senderNumber",
DROP COLUMN "trackingUrl",
ALTER COLUMN "subject" SET NOT NULL,
ALTER COLUMN "senderName" SET NOT NULL,
ALTER COLUMN "senderEmail" SET NOT NULL;

-- AlterTable
ALTER TABLE "phishing_targets" DROP COLUMN "failedAt",
DROP COLUMN "messageDelivered",
DROP COLUMN "messageFailed",
DROP COLUMN "messageId",
DROP COLUMN "messageOpened",
DROP COLUMN "messageSent",
DROP COLUMN "phoneNumber",
DROP COLUMN "smsProvider",
ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "phishing_templates" DROP COLUMN "defaultSenderNumber",
DROP COLUMN "messageContent",
DROP COLUMN "smsContent",
DROP COLUMN "templateType",
ALTER COLUMN "defaultSubject" SET NOT NULL,
ALTER COLUMN "defaultSenderName" SET NOT NULL,
ALTER COLUMN "emailBodyHtml" SET NOT NULL,
ALTER COLUMN "emailBodyText" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "verificationToken" TEXT,
ALTER COLUMN "emailVerified" SET DEFAULT false;

-- DropEnum
DROP TYPE "CampaignType";

-- DropEnum
DROP TYPE "TemplateType";
