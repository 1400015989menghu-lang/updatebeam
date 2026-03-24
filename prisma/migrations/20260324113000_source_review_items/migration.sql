CREATE TABLE "SourceReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "queueReason" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "seedUrl" TEXT,
    "detailsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "SourceReviewItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TrackedSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SourceReviewItem_dedupeKey_key" ON "SourceReviewItem"("dedupeKey");
CREATE INDEX "SourceReviewItem_sourceId_targetDate_idx" ON "SourceReviewItem"("sourceId", "targetDate");
CREATE INDEX "SourceReviewItem_status_createdAt_idx" ON "SourceReviewItem"("status", "createdAt");
