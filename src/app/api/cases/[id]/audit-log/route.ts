import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    try {
      const { id: caseId } = await params;

      const logs = await prisma.auditLog.findMany({
        where: { caseId },
        include: {
          user: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return jsonResponse({
        logs: logs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          details: log.details,
          performedBy: log.user?.name || "System",
          performedAt: log.createdAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching audit log:", error);
      return errorResponse("Failed to fetch audit log", 500);
    }
  });
}
