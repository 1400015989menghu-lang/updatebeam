import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const sqlitePrefix = "file:";
const configuredDatabaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

if (configuredDatabaseUrl.startsWith(sqlitePrefix)) {
  const databasePath = configuredDatabaseUrl.slice(sqlitePrefix.length);
  if (databasePath && !path.isAbsolute(databasePath)) {
    process.env.DATABASE_URL = `${sqlitePrefix}${path.resolve(process.cwd(), databasePath)}`;
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
