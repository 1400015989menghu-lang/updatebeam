CREATE TABLE "SourceRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "adapterName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorClass" TEXT,
    "automationLevel" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "normalizedCount" INTEGER NOT NULL DEFAULT 0,
    "insertedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "reviewItemCount" INTEGER NOT NULL DEFAULT 0,
    "notesJson" TEXT,
    "metadataJson" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TrackedSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SourceRun_sourceId_targetDate_idx" ON "SourceRun"("sourceId", "targetDate");
CREATE INDEX "SourceRun_status_targetDate_idx" ON "SourceRun"("status", "targetDate");
