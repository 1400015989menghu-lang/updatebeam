-- AlterTable
ALTER TABLE "TrackedSource" ADD COLUMN "organizationName" TEXT;
ALTER TABLE "TrackedSource" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'official-website';
ALTER TABLE "TrackedSource" ADD COLUMN "automationMode" TEXT NOT NULL DEFAULT 'html';
ALTER TABLE "TrackedSource" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "TrackedSource" ADD COLUMN "trustTier" TEXT NOT NULL DEFAULT 'official';
ALTER TABLE "TrackedSource" ADD COLUMN "includeKeywordsJson" TEXT;
ALTER TABLE "TrackedSource" ADD COLUMN "excludeKeywordsJson" TEXT;
ALTER TABLE "TrackedSource" ADD COLUMN "seedUrlsJson" TEXT;
ALTER TABLE "TrackedSource" ADD COLUMN "detailPatternsJson" TEXT;

-- CreateTable
CREATE TABLE "SourceUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceUrlHash" TEXT NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "publishedDate" DATETIME,
    "updatedDate" DATETIME,
    "summary" TEXT,
    "bodyText" TEXT,
    "label" TEXT NOT NULL DEFAULT 'Other',
    "matchedKeywordsJson" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SourceUpdate_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TrackedSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TrackedSource_sourceType_automationMode_idx" ON "TrackedSource"("sourceType", "automationMode");
CREATE UNIQUE INDEX "SourceUpdate_sourceId_sourceUrlHash_targetDate_key" ON "SourceUpdate"("sourceId", "sourceUrlHash", "targetDate");
CREATE UNIQUE INDEX "SourceUpdate_sourceId_slug_key" ON "SourceUpdate"("sourceId", "slug");
CREATE INDEX "SourceUpdate_sourceId_targetDate_idx" ON "SourceUpdate"("sourceId", "targetDate");
CREATE INDEX "SourceUpdate_isPublic_targetDate_idx" ON "SourceUpdate"("isPublic", "targetDate");
