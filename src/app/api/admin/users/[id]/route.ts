import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonResponse, errorResponse, withRole } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/admin/users/[id] - Get a single user (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(["ADMIN"], async (session) => {
    try {
      const { id } = await params;
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ownedCases: true,
              reviews: true,
              auditLogs: true,
            },
          },
        },
      });

      if (!user) {
        return errorResponse("User not found", 404);
      }

      return jsonResponse(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      return errorResponse("Failed to fetch user", 500);
    }
  });
}

// PUT /api/admin/users/[id] - Update a user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(["ADMIN"], async (session) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { email, name, password, role, department, isActive } = body;

      const updateData: any = {
        email,
        name,
        role,
        department,
        isActive,
      };

      // Only update password if provided
      if (password) {
        updateData.password = await hashPassword(password);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await logAuditEvent({
        userId: session.id,
        action: "USER_UPDATED",
        entityType: "User",
        entityId: user.id,
        details: { email: user.email, name: user.name },
      });

      return jsonResponse(user);
    } catch (error) {
      console.error("Error updating user:", error);
      return errorResponse("Failed to update user", 500);
    }
  });
}

// DELETE /api/admin/users/[id] - Delete a user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(["ADMIN"], async (session) => {
    try {
      const { id } = await params;

      // Prevent deleting self
      if (id === session.id) {
        return errorResponse("Cannot delete your own account", 400);
      }

      // Check if user owns any cases
      const caseCount = await prisma.case.count({
        where: { ownerId: id },
      });

      if (caseCount > 0) {
        return errorResponse(
          "Cannot delete user who owns cases. Deactivate the user instead.",
          400
        );
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { email: true, name: true },
      });

      await prisma.user.delete({
        where: { id },
      });

      await logAuditEvent({
        userId: session.id,
        action: "USER_DELETED",
        entityType: "User",
        entityId: id,
        details: { email: user?.email, name: user?.name },
      });

      return jsonResponse({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      return errorResponse("Failed to delete user", 500);
    }
  });
}
