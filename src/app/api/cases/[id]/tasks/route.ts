import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/cases/[id]/tasks - List tasks for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;

      const tasks = await prisma.task.findMany({
        where: { caseId: id },
        orderBy: { createdAt: "desc" },
      });

      return jsonResponse({ tasks });
    } catch (error) {
      console.error("Error fetching case tasks:", error);
      return errorResponse("Failed to fetch tasks", 500);
    }
  });
}

// POST /api/cases/[id]/tasks - Create a task for a case
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id: caseId } = await params;
      const body = await request.json();
      const { title, description, status, assigneeId, dueDate } = body;

      if (!title) {
        return errorResponse("Task title is required", 400);
      }

      // Verify case exists
      const caseExists = await prisma.case.findUnique({
        where: { id: caseId },
        select: { id: true, caseNumber: true },
      });

      if (!caseExists) {
        return errorResponse("Case not found", 404);
      }

      const task = await prisma.task.create({
        data: {
          caseId,
          title,
          description,
          status: status || "PENDING",
          assigneeId,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId,
        action: "TASK_CREATED",
        entityType: "Task",
        entityId: task.id,
        details: { title, caseNumber: caseExists.caseNumber },
      });

      return jsonResponse(task, 201);
    } catch (error) {
      console.error("Error creating task:", error);
      return errorResponse("Failed to create task", 500);
    }
  });
}

// PUT /api/cases/[id]/tasks - Update a task (expects taskId in body)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id: caseId } = await params;
      const body = await request.json();
      const { taskId, title, description, status, assigneeId, dueDate } = body;

      if (!taskId) {
        return errorResponse("Task ID is required", 400);
      }

      const task = await prisma.task.update({
        where: { id: taskId, caseId },
        data: {
          title,
          description,
          status,
          assigneeId,
          dueDate: dueDate ? new Date(dueDate) : null,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId,
        action: "TASK_UPDATED",
        entityType: "Task",
        entityId: task.id,
        details: { title: task.title, status },
      });

      return jsonResponse(task);
    } catch (error) {
      console.error("Error updating task:", error);
      return errorResponse("Failed to update task", 500);
    }
  });
}
