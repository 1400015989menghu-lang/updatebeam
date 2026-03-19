import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/review - List review queue items with filters
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const type = searchParams.get("type");
      const status = searchParams.get("status");
      const caseId = searchParams.get("caseId");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const skip = (page - 1) * limit;

      const where: any = {};

      if (type) where.type = type;
      if (status) where.status = status;
      if (caseId) where.caseId = caseId;

      const [items, total] = await Promise.all([
        prisma.reviewItem.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            case: {
              select: { id: true, caseNumber: true, title: true },
            },
            document: {
              select: { id: true, fileName: true },
            },
            reviewer: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.reviewItem.count({ where }),
      ]);

      return jsonResponse({
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching review items:", error);
      return errorResponse("Failed to fetch review items", 500);
    }
  });
}

// POST /api/review - Create a review item
export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await request.json();
      const {
        caseId,
        documentId,
        type,
        title,
        description,
        aiOutput,
        sourceRefs,
        confidence,
      } = body;

      if (!type || !title) {
        return errorResponse("Missing required fields", 400);
      }

      const item = await prisma.reviewItem.create({
        data: {
          caseId,
          documentId,
          type,
          title,
          description,
          aiOutput,
          sourceRefs,
          confidence,
          status: "NEW",
        },
        include: {
          case: {
            select: { id: true, caseNumber: true },
          },
        },
      });

      if (caseId) {
        await logAuditEvent({
          userId: session.id,
          caseId,
          action: "REVIEW_ITEM_CREATED",
          entityType: "ReviewItem",
          entityId: item.id,
          details: { type, title },
        });
      }

      return jsonResponse(item, 201);
    } catch (error) {
      console.error("Error creating review item:", error);
      return errorResponse("Failed to create review item", 500);
    }
  });
}
