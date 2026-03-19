import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/review/[id] - Get a single review item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const item = await prisma.reviewItem.findUnique({
        where: { id },
        include: {
          case: {
            select: { id: true, caseNumber: true, title: true },
          },
          document: {
            select: { id: true, fileName: true, filePath: true },
          },
          reviewer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!item) {
        return errorResponse("Review item not found", 404);
      }

      return jsonResponse(item);
    } catch (error) {
      console.error("Error fetching review item:", error);
      return errorResponse("Failed to fetch review item", 500);
    }
  });
}

// PUT /api/review/[id] - Take action on a review item (approve/reject/edit/needs-more-info)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { action, editedContent, rejectionReason } = body;

      if (!action) {
        return errorResponse("Action is required", 400);
      }

      const validActions = ["APPROVED", "REJECTED", "EDITED", "NEEDS_MORE_INFO"];
      if (!validActions.includes(action)) {
        return errorResponse("Invalid action", 400);
      }

      const updateData: any = {
        status: action,
        reviewerId: session.id,
        resolvedAt: action !== "NEEDS_MORE_INFO" ? new Date() : null,
      };

      if (action === "EDITED" && editedContent) {
        updateData.editedContent = editedContent;
      }

      if (action === "REJECTED" && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      const item = await prisma.reviewItem.update({
        where: { id },
        data: updateData,
        include: {
          case: {
            select: { id: true, caseNumber: true },
          },
          reviewer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (item.caseId) {
        await logAuditEvent({
          userId: session.id,
          caseId: item.caseId,
          action: "REVIEW_ITEM_ACTIONED",
          entityType: "ReviewItem",
          entityId: item.id,
          details: { action, type: item.type },
        });
      }

      return jsonResponse(item);
    } catch (error) {
      console.error("Error updating review item:", error);
      return errorResponse("Failed to update review item", 500);
    }
  });
}
