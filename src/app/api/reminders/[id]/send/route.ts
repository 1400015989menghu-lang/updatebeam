import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { markReminderSent } from "@/services/reminder-service";
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

    await markReminderSent(reminderId, session.id);

    return NextResponse.json({
      success: true,
      message: "Reminder marked as sent",
      reminder: {
        id: reminder.id,
        reminderType: reminder.reminderType,
        scheduledAt: reminder.scheduledAt,
        status: "SENT",
        sentAt: new Date().toISOString(),
        caseNumber: reminder.case.caseNumber,
        clientName: reminder.case.client.name,
        recipientEmail: reminder.recipientEmail,
        recipientPhone: reminder.recipientPhone,
        channel: reminder.channel,
      },
    });
  } catch (error) {
    console.error("Error marking reminder as sent:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to mark reminder as sent";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
