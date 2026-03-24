import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.resolve(__dirname, "../data/source-manifest.json");

function normalizeJsonArray(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  return JSON.stringify(value);
}

async function main() {
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  if (!Array.isArray(manifest)) {
    throw new Error(`Expected source manifest array at ${manifestPath}`);
  }

  for (const source of manifest) {
    await prisma.trackedSource.upsert({
      where: { slug: source.slug },
      update: {
        name: source.name,
        organizationName: source.organizationName ?? null,
        description: source.description ?? null,
        rootUrl: source.rootUrl,
        category: source.category,
        adapterType: source.adapterType,
        sourceType: source.sourceType,
        automationMode: source.automationMode,
        language: source.language ?? "en",
        trustTier: source.trustTier ?? "official",
        includeKeywordsJson: normalizeJsonArray(source.includeKeywords),
        excludeKeywordsJson: normalizeJsonArray(source.excludeKeywords),
        seedUrlsJson: normalizeJsonArray(source.seedUrls),
        detailPatternsJson: normalizeJsonArray(source.detailPatterns),
        timezone: source.timezone ?? "Asia/Kuala_Lumpur",
        cadence: source.cadence ?? "daily",
        isActive: source.isActive ?? true,
        isPublic: source.isPublic ?? true,
      },
      create: {
        slug: source.slug,
        name: source.name,
        organizationName: source.organizationName ?? null,
        description: source.description ?? null,
        rootUrl: source.rootUrl,
        category: source.category,
        adapterType: source.adapterType,
        sourceType: source.sourceType,
        automationMode: source.automationMode,
        language: source.language ?? "en",
        trustTier: source.trustTier ?? "official",
        includeKeywordsJson: normalizeJsonArray(source.includeKeywords),
        excludeKeywordsJson: normalizeJsonArray(source.excludeKeywords),
        seedUrlsJson: normalizeJsonArray(source.seedUrls),
        detailPatternsJson: normalizeJsonArray(source.detailPatterns),
        timezone: source.timezone ?? "Asia/Kuala_Lumpur",
        cadence: source.cadence ?? "daily",
        isActive: source.isActive ?? true,
        isPublic: source.isPublic ?? true,
      },
    });
  }

  console.log(`Seeded ${manifest.length} tracked sources for the public monitoring SaaS.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
