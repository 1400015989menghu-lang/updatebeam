import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const requiredEnv = [
  "DATABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "MAIL_FROM",
];

const optionalEnv = [
  "MAIL_FROM_NAME",
  "APP_URL",
];

const missingRequired = requiredEnv.filter((key) => !process.env[key]?.trim());

for (const key of requiredEnv) {
  const value = process.env[key]?.trim();
  console.log(`${key}: ${value ? "configured" : "missing"}`);
}

for (const key of optionalEnv) {
  const value = process.env[key]?.trim();
  console.log(`${key}: ${value ? "configured" : "not set"}`);
}

if (missingRequired.length > 0) {
  console.error(`\nMissing required environment variables: ${missingRequired.join(", ")}`);
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const [sourceCount, publicSourceCount, subscriberCount] = await Promise.all([
    prisma.trackedSource.count(),
    prisma.trackedSource.count({ where: { isPublic: true, isActive: true } }),
    prisma.emailSubscriber.count(),
  ]);

  console.log("\nDatabase connection: ok");
  console.log(`Tracked sources: ${sourceCount}`);
  console.log(`Public active sources: ${publicSourceCount}`);
  console.log(`Subscribers: ${subscriberCount}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  try {
    const parsedUrl = new URL(appUrl);
    console.log(`App URL: valid (${parsedUrl.origin})`);
  } catch {
    console.error(`App URL: invalid (${appUrl})`);
    process.exitCode = 1;
  }

  console.log("\nDeployment check completed.");
} catch (error) {
  console.error("\nDatabase connection failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
