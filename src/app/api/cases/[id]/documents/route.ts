import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/cases/[id]/documents - List documents for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;

      const documents = await prisma.document.findMany({
        where: { caseId: id },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { versions: true },
          },
        },
      });

      return jsonResponse({ documents });
    } catch (error) {
      console.error("Error fetching case documents:", error);
      return errorResponse("Failed to fetch documents", 500);
    }
  });
}

// POST /api/cases/[id]/documents - Upload a document to a case
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id: caseId } = await params;

      // Verify case exists
      const caseExists = await prisma.case.findUnique({
        where: { id: caseId },
        select: { id: true, caseNumber: true },
      });

      if (!caseExists) {
        return errorResponse("Case not found", 404);
      }

      const body = await request.json();
      const { fileName, fileType, filePath, fileSize, category, isSensitive } = body;

      if (!fileName || !fileType || !filePath || !fileSize) {
        return errorResponse("Missing required fields", 400);
      }

      const document = await prisma.document.create({
        data: {
          caseId,
          fileName,
          fileType,
          filePath,
          fileSize,
          category,
          isSensitive: isSensitive || false,
          uploadedById: session.id,
          status: "RECEIVED",
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId,
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: document.id,
        details: { fileName, caseNumber: caseExists.caseNumber },
      });

      return jsonResponse(document, 201);
    } catch (error) {
      console.error("Error uploading document:", error);
      return errorResponse("Failed to upload document", 500);
    }
  });
}
