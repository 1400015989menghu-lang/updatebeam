import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";

// GET /api/cases/[id]/reminders - List reminders for a case
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { id } = await params;

      const reminders = await prisma.reminderEvent.findMany({
        where: { caseId: id },
        orderBy: { scheduledAt: "desc" },
        include: {
          template: {
            select: { id: true, name: true },
          },
          sentBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return jsonResponse({ reminders });
    } catch (error) {
      console.error("Error fetching case reminders:", error);
      return errorResponse("Failed to fetch reminders", 500);
    }
  });
}
