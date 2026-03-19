import { prisma } from "./prisma";

interface AuditLogInput {
  userId?: string;
  caseId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAuditEvent(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      caseId: input.caseId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details ? JSON.stringify(input.details) : null,
      ipAddress: input.ipAddress,
    },
  });
}
