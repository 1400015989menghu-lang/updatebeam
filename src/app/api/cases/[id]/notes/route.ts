import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/cases/[id]/notes - List notes for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;

      const notes = await prisma.caseNote.findMany({
        where: { caseId: id },
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return jsonResponse({ notes });
    } catch (error) {
      console.error("Error fetching case notes:", error);
      return errorResponse("Failed to fetch notes", 500);
    }
  });
}

// POST /api/cases/[id]/notes - Create a note for a case
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id: caseId } = await params;
      const body = await request.json();
      const { content } = body;

      if (!content) {
        return errorResponse("Note content is required", 400);
      }

      // Verify case exists
      const caseExists = await prisma.case.findUnique({
        where: { id: caseId },
        select: { id: true, caseNumber: true },
      });

      if (!caseExists) {
        return errorResponse("Case not found", 404);
      }

      const note = await prisma.caseNote.create({
        data: {
          caseId,
          authorId: session.id,
          content,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId,
        action: "NOTE_ADDED",
        entityType: "CaseNote",
        entityId: note.id,
        details: { caseNumber: caseExists.caseNumber },
      });

      return jsonResponse(note, 201);
    } catch (error) {
      console.error("Error creating note:", error);
      return errorResponse("Failed to create note", 500);
    }
  });
}
