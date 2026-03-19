import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { stopReminder } from "@/services/reminder-service";
import { prisma } from "@/lib/prisma";

// POST /api/reminders/[id]/stop - Stop a reminder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: reminderId } = await params;
    const body = await request.json();
    const { stopReason } = body;

    if (!stopReason || typeof stopReason !== "string" || stopReason.trim().length === 0) {
      return NextResponse.json(
        { error: "Stop reason is required" },
        { status: 400 }
      );
    }

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

    await stopReminder(reminderId, session.id, stopReason);

    return NextResponse.json({
      success: true,
      message: "Reminder stopped",
      reminder: {
        id: reminder.id,
        reminderType: reminder.reminderType,
        scheduledAt: reminder.scheduledAt,
        status: "STOPPED",
        stopReason: stopReason,
        stoppedAt: new Date().toISOString(),
        caseNumber: reminder.case.caseNumber,
        clientName: reminder.case.client.name,
      },
    });
  } catch (error) {
    console.error("Error stopping reminder:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to stop reminder";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
