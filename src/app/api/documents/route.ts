import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";

// GET /api/documents - List documents with filters
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const caseId = searchParams.get("caseId");
      const category = searchParams.get("category");
      const status = searchParams.get("status");
      const isSensitive = searchParams.get("isSensitive");
      const search = searchParams.get("search") || "";
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const skip = (page - 1) * limit;

      const where: any = {};

      if (caseId) where.caseId = caseId;
      if (category) where.category = category;
      if (status) where.status = status;
      if (isSensitive !== null) where.isSensitive = isSensitive === "true";

      if (search) {
        where.OR = [
          { fileName: { contains: search, mode: "insensitive" as const } },
          { category: { contains: search, mode: "insensitive" as const } },
        ];
      }

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            case: {
              select: { id: true, caseNumber: true, title: true },
            },
            _count: {
              select: { versions: true, extractedFields: true },
            },
          },
        }),
        prisma.document.count({ where }),
      ]);

      return jsonResponse({
        documents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      return errorResponse("Failed to fetch documents", 500);
    }
  });
}
