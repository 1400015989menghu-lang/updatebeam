import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";

// GET /api/audit-log - List audit logs with filters
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      const caseId = searchParams.get("caseId");
      const action = searchParams.get("action");
      const entityType = searchParams.get("entityType");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const skip = (page - 1) * limit;

      const where: any = {};

      if (userId) where.userId = userId;
      if (caseId) where.caseId = caseId;
      if (action) where.action = action;
      if (entityType) where.entityType = entityType;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            case: {
              select: { id: true, caseNumber: true, title: true },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return jsonResponse({
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return errorResponse("Failed to fetch audit logs", 500);
    }
  });
}
