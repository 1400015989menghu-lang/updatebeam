-- CreateTable
CREATE TABLE "EmailSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
    "preferredSendHour" INTEGER NOT NULL DEFAULT 8,
    "preferredSendMinute" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "activatedAt" DATETIME,
    "bouncedAt" DATETIME,
    "lastManagedAt" DATETIME
);

-- CreateTable
CREATE TABLE "TrackedSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rootUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "adapterType" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
    "cadence" TEXT NOT NULL DEFAULT 'daily',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "lastSuccessfulRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SubscriberSourceSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "unsubscribedAt" DATETIME,
    CONSTRAINT "SubscriberSourceSubscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "EmailSubscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubscriberSourceSubscription_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TrackedSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriptionToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "type" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" DATETIME,
    CONSTRAINT "SubscriptionToken_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "EmailSubscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubscriptionToken_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "SubscriberSourceSubscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DigestDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "subject" TEXT NOT NULL,
    "emailId" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DigestDelivery_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TrackedSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DigestDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "EmailSubscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriberDigestDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriberId" TEXT NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "subject" TEXT NOT NULL,
    "emailId" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "retryAfter" DATETIME,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubscriberDigestDelivery_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "EmailSubscriber" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubscriberDigestDeliverySource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriberDigestDeliverySource_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "SubscriberDigestDelivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubscriberDigestDeliverySource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TrackedSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteName" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contactEmail" TEXT,
    "requestedCategory" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reviewedAt" DATETIME,
    "trackedSourceId" TEXT,
    CONSTRAINT "SourceSubmission_trackedSourceId_fkey" FOREIGN KEY ("trackedSourceId") REFERENCES "TrackedSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeedbackSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'general',
    "message" TEXT NOT NULL,
    "email" TEXT,
    "page" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_email_key" ON "EmailSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedSource_slug_key" ON "TrackedSource"("slug");

-- CreateIndex
CREATE INDEX "TrackedSource_isActive_isPublic_idx" ON "TrackedSource"("isActive", "isPublic");

-- CreateIndex
CREATE INDEX "TrackedSource_category_isActive_idx" ON "TrackedSource"("category", "isActive");

-- CreateIndex
CREATE INDEX "SubscriberSourceSubscription_status_idx" ON "SubscriberSourceSubscription"("status");

-- CreateIndex
CREATE INDEX "SubscriberSourceSubscription_sourceId_status_idx" ON "SubscriberSourceSubscription"("sourceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriberSourceSubscription_subscriberId_sourceId_key" ON "SubscriberSourceSubscription"("subscriberId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionToken_token_key" ON "SubscriptionToken"("token");

-- CreateIndex
CREATE INDEX "SubscriptionToken_type_expiresAt_idx" ON "SubscriptionToken"("type", "expiresAt");

-- CreateIndex
CREATE INDEX "SubscriptionToken_subscriberId_idx" ON "SubscriptionToken"("subscriberId");

-- CreateIndex
CREATE INDEX "DigestDelivery_status_targetDate_idx" ON "DigestDelivery"("status", "targetDate");

-- CreateIndex
CREATE INDEX "DigestDelivery_sourceId_targetDate_idx" ON "DigestDelivery"("sourceId", "targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "DigestDelivery_sourceId_subscriberId_targetDate_key" ON "DigestDelivery"("sourceId", "subscriberId", "targetDate");

-- CreateIndex
CREATE INDEX "SubscriberDigestDelivery_status_scheduledFor_idx" ON "SubscriberDigestDelivery"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "SubscriberDigestDelivery_targetDate_status_idx" ON "SubscriberDigestDelivery"("targetDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriberDigestDelivery_subscriberId_targetDate_key" ON "SubscriberDigestDelivery"("subscriberId", "targetDate");

-- CreateIndex
CREATE INDEX "SubscriberDigestDeliverySource_sourceId_idx" ON "SubscriberDigestDeliverySource"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriberDigestDeliverySource_deliveryId_sourceId_key" ON "SubscriberDigestDeliverySource"("deliveryId", "sourceId");

-- CreateIndex
CREATE INDEX "SourceSubmission_status_createdAt_idx" ON "SourceSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SourceSubmission_siteUrl_idx" ON "SourceSubmission"("siteUrl");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_status_createdAt_idx" ON "FeedbackSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_type_createdAt_idx" ON "FeedbackSubmission"("type", "createdAt");
