import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/reminders - List reminders with filters
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const caseId = searchParams.get("caseId");
      const channel = searchParams.get("channel");
      const reminderType = searchParams.get("reminderType");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const skip = (page - 1) * limit;

      const where: any = {};

      if (status) where.status = status;
      if (caseId) where.caseId = caseId;
      if (channel) where.channel = channel;
      if (reminderType) where.reminderType = reminderType;

      const [reminders, total] = await Promise.all([
        prisma.reminderEvent.findMany({
          where,
          skip,
          take: limit,
          orderBy: { scheduledAt: "desc" },
          include: {
            case: {
              select: { id: true, caseNumber: true, title: true },
            },
            template: {
              select: { id: true, name: true },
            },
            sentBy: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.reminderEvent.count({ where }),
      ]);

      return jsonResponse({
        reminders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching reminders:", error);
      return errorResponse("Failed to fetch reminders", 500);
    }
  });
}

// POST /api/reminders - Create a new reminder
export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await request.json();
      const {
        caseId,
        templateId,
        channel,
        recipientEmail,
        recipientPhone,
        recipientName,
        subject,
        body: messageBody,
        reminderType,
        scheduledAt,
        escalationLevel,
      } = body;

      if (!caseId || !channel || !reminderType || !scheduledAt) {
        return errorResponse("Missing required fields", 400);
      }

      // Verify case exists
      const caseExists = await prisma.case.findUnique({
        where: { id: caseId },
        select: { id: true, caseNumber: true },
      });

      if (!caseExists) {
        return errorResponse("Case not found", 404);
      }

      const reminder = await prisma.reminderEvent.create({
        data: {
          caseId,
          templateId,
          channel,
          recipientEmail,
          recipientPhone,
          recipientName,
          subject,
          body: messageBody,
          reminderType,
          escalationLevel: escalationLevel || 1,
          status: "SCHEDULED",
          scheduledAt: new Date(scheduledAt),
        },
        include: {
          case: {
            select: { id: true, caseNumber: true },
          },
          template: {
            select: { id: true, name: true },
          },
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId,
        action: "REMINDER_CREATED",
        entityType: "ReminderEvent",
        entityId: reminder.id,
        details: {
          caseNumber: caseExists.caseNumber,
          channel,
          reminderType,
        },
      });

      return jsonResponse(reminder, 201);
    } catch (error) {
      console.error("Error creating reminder:", error);
      return errorResponse("Failed to create reminder", 500);
    }
  });
}
