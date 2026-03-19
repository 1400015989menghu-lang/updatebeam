import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/cases/[id] - Get a single case with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const caseData = await prisma.case.findUnique({
        where: { id },
        include: {
          client: {
            include: {
              contacts: true,
            },
          },
          owner: {
            select: { id: true, name: true, email: true, department: true },
          },
          engagement: true,
          documents: {
            orderBy: { createdAt: "desc" },
          },
          reminders: {
            orderBy: { scheduledAt: "desc" },
            take: 20,
          },
          notes: {
            orderBy: { createdAt: "desc" },
            include: {
              author: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          tasks: {
            orderBy: { createdAt: "desc" },
          },
          reviewItems: {
            orderBy: { createdAt: "desc" },
          },
          submissionPackage: true,
        },
      });

      if (!caseData) {
        return errorResponse("Case not found", 404);
      }

      return jsonResponse(caseData);
    } catch (error) {
      console.error("Error fetching case:", error);
      return errorResponse("Failed to fetch case", 500);
    }
  });
}

// PUT /api/cases/[id] - Update a case
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const {
        title,
        description,
        department,
        caseType,
        status,
        priority,
        dueDate,
        anniversaryDate,
        financialYearEnd,
        paymentStatus,
        outstandingAmount,
        signedCopyReceived,
        originalSignedReceived,
        blockerType,
        blockerNote,
      } = body;

      const updatedCase = await prisma.case.update({
        where: { id },
        data: {
          title,
          description,
          department,
          caseType,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
          financialYearEnd: financialYearEnd ? new Date(financialYearEnd) : null,
          paymentStatus,
          outstandingAmount,
          signedCopyReceived,
          originalSignedReceived,
          blockerType,
          blockerNote,
        },
        include: {
          client: true,
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId: updatedCase.id,
        action: "CASE_UPDATED",
        entityType: "Case",
        entityId: updatedCase.id,
        details: { caseNumber: updatedCase.caseNumber },
      });

      return jsonResponse(updatedCase);
    } catch (error) {
      console.error("Error updating case:", error);
      return errorResponse("Failed to update case", 500);
    }
  });
}

// PATCH /api/cases/[id] - Change case status (with audit logging)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { status, note } = body;

      if (!status) {
        return errorResponse("Status is required", 400);
      }

      const existingCase = await prisma.case.findUnique({
        where: { id },
        select: { status: true, caseNumber: true },
      });

      if (!existingCase) {
        return errorResponse("Case not found", 404);
      }

      const updatedCase = await prisma.case.update({
        where: { id },
        data: { status },
        include: {
          client: true,
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId: updatedCase.id,
        action: "CASE_STATUS_CHANGED",
        entityType: "Case",
        entityId: updatedCase.id,
        details: {
          caseNumber: updatedCase.caseNumber,
          oldStatus: existingCase.status,
          newStatus: status,
          note,
        },
      });

      return jsonResponse(updatedCase);
    } catch (error) {
      console.error("Error changing case status:", error);
      return errorResponse("Failed to change case status", 500);
    }
  });
}

// DELETE /api/cases/[id] - Delete a case
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;

      const caseData = await prisma.case.findUnique({
        where: { id },
        select: { caseNumber: true },
      });

      if (!caseData) {
        return errorResponse("Case not found", 404);
      }

      await prisma.case.delete({
        where: { id },
      });

      await logAuditEvent({
        userId: session.id,
        action: "CASE_DELETED",
        entityType: "Case",
        entityId: id,
        details: { caseNumber: caseData.caseNumber },
      });

      return jsonResponse({ success: true });
    } catch (error) {
      console.error("Error deleting case:", error);
      return errorResponse("Failed to delete case", 500);
    }
  });
}
