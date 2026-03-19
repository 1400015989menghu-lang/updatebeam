import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { approveReminder } from "@/services/reminder-service";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: reminderId } = await params;

    // Verify reminder exists
    const reminder = await prisma.reminderEvent.findUnique({
      where: { id: reminderId },
      include: {
        case: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    await approveReminder(reminderId, session.id);

    return NextResponse.json({
      success: true,
      message: "Reminder approved",
      reminder: {
        id: reminder.id,
        reminderType: reminder.reminderType,
        scheduledAt: reminder.scheduledAt,
        status: "APPROVED",
        caseNumber: reminder.case.caseNumber,
        clientName: reminder.case.client.name,
      },
    });
  } catch (error) {
    console.error("Error approving reminder:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to approve reminder";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
