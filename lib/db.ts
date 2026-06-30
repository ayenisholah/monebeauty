import { PrismaClient } from "@prisma/client";

// Singleton Prisma client (avoids exhausting connections during dev HMR).
// NOTE: no live database is provisioned yet (Phase 0). The client is generated
// for type-safety; queries begin in Phase 2/3 once DATABASE_URL points at a DB.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
