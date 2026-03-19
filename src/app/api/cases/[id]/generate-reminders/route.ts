import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { generateReminderSchedule } from "@/services/reminder-service";
import { prisma } from "@/lib/prisma";
import { REVIEW_ITEM_TYPE } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: caseId } = await params;

    // Verify case exists
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        client: true,
      },
    });

    if (!caseData) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    // Generate reminder schedule
    const reminderIds = await generateReminderSchedule(caseId);

    // Create review items for each generated reminder so staff can review before sending
    const reviewItems = await Promise.all(
      reminderIds.map(async (reminderId) => {
        const reminder = await prisma.reminderEvent.findUnique({
          where: { id: reminderId },
        });

        if (!reminder) return null;

        return prisma.reviewItem.create({
          data: {
            caseId,
            type: REVIEW_ITEM_TYPE.REMINDER_DRAFT,
            title: `Review ${reminder.reminderType} reminder`,
            description: `Scheduled for ${reminder.scheduledAt.toLocaleDateString()} via ${reminder.channel}`,
            aiOutput: JSON.stringify({
              reminderId: reminder.id,
              subject: reminder.subject,
              body: reminder.body,
              recipientEmail: reminder.recipientEmail,
              recipientPhone: reminder.recipientPhone,
              recipientName: reminder.recipientName,
              channel: reminder.channel,
              scheduledAt: reminder.scheduledAt,
            }),
            sourceRefs: JSON.stringify({
              reminderId: reminder.id,
              caseId: caseId,
            }),
            status: "NEW",
          },
        });
      })
    );

    const validReviewItems = reviewItems.filter(item => item !== null);

    return NextResponse.json({
      success: true,
      message: `Generated ${reminderIds.length} reminder(s)`,
      reminderIds,
      reviewItemIds: validReviewItems.map(item => item!.id),
      caseNumber: caseData.caseNumber,
      clientName: caseData.client.name,
    });
  } catch (error) {
    console.error("Error generating reminders:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate reminders";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
