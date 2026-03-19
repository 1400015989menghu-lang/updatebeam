import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/reminders/[id] - Get a single reminder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const reminder = await prisma.reminderEvent.findUnique({
        where: { id },
        include: {
          case: {
            select: { id: true, caseNumber: true, title: true },
          },
          template: true,
          sentBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!reminder) {
        return errorResponse("Reminder not found", 404);
      }

      return jsonResponse(reminder);
    } catch (error) {
      console.error("Error fetching reminder:", error);
      return errorResponse("Failed to fetch reminder", 500);
    }
  });
}

// PUT /api/reminders/[id] - Update a reminder
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const {
        channel,
        recipientEmail,
        recipientPhone,
        recipientName,
        subject,
        body: messageBody,
        scheduledAt,
        status,
      } = body;

      const reminder = await prisma.reminderEvent.update({
        where: { id },
        data: {
          channel,
          recipientEmail,
          recipientPhone,
          recipientName,
          subject,
          body: messageBody,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          status,
        },
        include: {
          case: {
            select: { id: true, caseNumber: true },
          },
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId: reminder.caseId,
        action: "REMINDER_UPDATED",
        entityType: "ReminderEvent",
        entityId: reminder.id,
        details: { status },
      });

      return jsonResponse(reminder);
    } catch (error) {
      console.error("Error updating reminder:", error);
      return errorResponse("Failed to update reminder", 500);
    }
  });
}
