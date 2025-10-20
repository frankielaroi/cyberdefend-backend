-- CreateTable
CREATE TABLE "email_tracking" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "emailSubject" TEXT,
    "emailType" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "lastOpenedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "deviceType" TEXT,
    "userId" TEXT,
    "notificationHistoryId" TEXT,
    "phishingCampaignId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_tracking_trackingId_key" ON "email_tracking"("trackingId");

-- CreateIndex
CREATE INDEX "email_tracking_trackingId_idx" ON "email_tracking"("trackingId");

-- CreateIndex
CREATE INDEX "email_tracking_recipientEmail_idx" ON "email_tracking"("recipientEmail");

-- CreateIndex
CREATE INDEX "email_tracking_sentAt_idx" ON "email_tracking"("sentAt");

-- AddForeignKey
ALTER TABLE "email_tracking" ADD CONSTRAINT "email_tracking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_tracking" ADD CONSTRAINT "email_tracking_notificationHistoryId_fkey" FOREIGN KEY ("notificationHistoryId") REFERENCES "notification_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_tracking" ADD CONSTRAINT "email_tracking_phishingCampaignId_fkey" FOREIGN KEY ("phishingCampaignId") REFERENCES "phishing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
