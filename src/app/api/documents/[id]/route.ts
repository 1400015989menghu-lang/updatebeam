import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/documents/[id] - Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          case: {
            select: { id: true, caseNumber: true, title: true, clientId: true },
          },
          versions: {
            orderBy: { version: "desc" },
          },
          extractedFields: {
            orderBy: { createdAt: "desc" },
          },
          reviewItems: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!document) {
        return errorResponse("Document not found", 404);
      }

      return jsonResponse(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      return errorResponse("Failed to fetch document", 500);
    }
  });
}

// PUT /api/documents/[id] - Update document metadata
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const {
        category,
        status,
        isSensitive,
        retentionPolicy,
        classificationResult,
        classificationConfidence,
      } = body;

      const document = await prisma.document.update({
        where: { id },
        data: {
          category,
          status,
          isSensitive,
          retentionPolicy,
          classificationResult,
          classificationConfidence,
        },
        include: {
          case: {
            select: { id: true, caseNumber: true },
          },
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId: document.caseId,
        action: "DOCUMENT_UPDATED",
        entityType: "Document",
        entityId: document.id,
        details: { fileName: document.fileName, status },
      });

      return jsonResponse(document);
    } catch (error) {
      console.error("Error updating document:", error);
      return errorResponse("Failed to update document", 500);
    }
  });
}
