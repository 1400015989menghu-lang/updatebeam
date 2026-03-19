import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/reminders/templates - List reminder templates
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const department = searchParams.get("department");
      const channel = searchParams.get("channel");
      const reminderType = searchParams.get("reminderType");
      const isActive = searchParams.get("isActive");

      const where: any = {};

      if (department) where.department = department;
      if (channel) where.channel = channel;
      if (reminderType) where.reminderType = reminderType;
      if (isActive !== null) where.isActive = isActive === "true";

      const templates = await prisma.reminderTemplate.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return jsonResponse({ templates });
    } catch (error) {
      console.error("Error fetching reminder templates:", error);
      return errorResponse("Failed to fetch reminder templates", 500);
    }
  });
}

// POST /api/reminders/templates - Create a reminder template
export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await request.json();
      const { name, department, channel, subject, body: templateBody, reminderType, isActive } =
        body;

      if (!name || !channel || !templateBody || !reminderType) {
        return errorResponse("Missing required fields", 400);
      }

      const template = await prisma.reminderTemplate.create({
        data: {
          name,
          department,
          channel,
          subject,
          body: templateBody,
          reminderType,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      await logAuditEvent({
        userId: session.id,
        action: "REMINDER_TEMPLATE_CREATED",
        entityType: "ReminderTemplate",
        entityId: template.id,
        details: { name, channel, reminderType },
      });

      return jsonResponse(template, 201);
    } catch (error) {
      console.error("Error creating reminder template:", error);
      return errorResponse("Failed to create reminder template", 500);
    }
  });
}

// PUT /api/reminders/templates - Update a reminder template (expects templateId in body)
export async function PUT(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await request.json();
      const {
        templateId,
        name,
        department,
        channel,
        subject,
        body: templateBody,
        reminderType,
        isActive,
      } = body;

      if (!templateId) {
        return errorResponse("Template ID is required", 400);
      }

      const template = await prisma.reminderTemplate.update({
        where: { id: templateId },
        data: {
          name,
          department,
          channel,
          subject,
          body: templateBody,
          reminderType,
          isActive,
        },
      });

      await logAuditEvent({
        userId: session.id,
        action: "REMINDER_TEMPLATE_UPDATED",
        entityType: "ReminderTemplate",
        entityId: template.id,
        details: { name },
      });

      return jsonResponse(template);
    } catch (error) {
      console.error("Error updating reminder template:", error);
      return errorResponse("Failed to update reminder template", 500);
    }
  });
}
