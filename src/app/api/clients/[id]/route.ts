import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/clients/[id] - Get a single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          contacts: {
            orderBy: { isPrimary: "desc" },
          },
          engagements: {
            orderBy: { createdAt: "desc" },
          },
          cases: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              owner: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          _count: {
            select: { cases: true },
          },
        },
      });

      if (!client) {
        return errorResponse("Client not found", 404);
      }

      return jsonResponse(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      return errorResponse("Failed to fetch client", 500);
    }
  });
}

// PUT /api/clients/[id] - Update a client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const {
        name,
        businessType,
        registrationNo,
        incorporationDate,
        anniversaryDate,
        financialYearEnd,
        taxAgentCode,
        isActive,
      } = body;

      const client = await prisma.client.update({
        where: { id },
        data: {
          name,
          businessType,
          registrationNo,
          incorporationDate: incorporationDate ? new Date(incorporationDate) : null,
          anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
          financialYearEnd: financialYearEnd ? new Date(financialYearEnd) : null,
          taxAgentCode,
          isActive,
        },
        include: {
          contacts: true,
        },
      });

      await logAuditEvent({
        userId: session.id,
        action: "CLIENT_UPDATED",
        entityType: "Client",
        entityId: client.id,
        details: { name: client.name },
      });

      return jsonResponse(client);
    } catch (error) {
      console.error("Error updating client:", error);
      return errorResponse("Failed to update client", 500);
    }
  });
}

// DELETE /api/clients/[id] - Delete a client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;

      // Check if client has cases
      const caseCount = await prisma.case.count({
        where: { clientId: id },
      });

      if (caseCount > 0) {
        return errorResponse(
          "Cannot delete client with existing cases. Archive the client instead.",
          400
        );
      }

      await prisma.client.delete({
        where: { id },
      });

      await logAuditEvent({
        userId: session.id,
        action: "CLIENT_DELETED",
        entityType: "Client",
        entityId: id,
      });

      return jsonResponse({ success: true });
    } catch (error) {
      console.error("Error deleting client:", error);
      return errorResponse("Failed to delete client", 500);
    }
  });
}
