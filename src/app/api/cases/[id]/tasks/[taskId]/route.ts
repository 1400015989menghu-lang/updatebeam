import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// PATCH /api/cases/[id]/tasks/[taskId] - Update a specific task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id: caseId, taskId } = await params;
      const body = await request.json();
      const { title, description, status, assigneeId, dueDate } = body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) {
        updateData.status = status;
        if (status === "COMPLETED") {
          updateData.completedAt = new Date();
        } else if (status === "PENDING" || status === "IN_PROGRESS") {
          updateData.completedAt = null;
        }
      }
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

      const task = await prisma.task.update({
        where: { id: taskId, caseId },
        data: updateData,
      });

      await logAuditEvent({
        userId: session.id,
        caseId,
        action: "TASK_UPDATED",
        entityType: "Task",
        entityId: task.id,
        details: { title: task.title, status: task.status },
      });

      return jsonResponse(task);
    } catch (error) {
      console.error("Error updating task:", error);
      return errorResponse("Failed to update task", 500);
    }
  });
}

// DELETE /api/cases/[id]/tasks/[taskId] - Delete a specific task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id: caseId, taskId } = await params;

      const task = await prisma.task.delete({
        where: { id: taskId, caseId },
      });

      await logAuditEvent({
        userId: session.id,
        caseId,
        action: "TASK_DELETED",
        entityType: "Task",
        entityId: task.id,
        details: { title: task.title },
      });

      return jsonResponse({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      return errorResponse("Failed to delete task", 500);
    }
  });
}
