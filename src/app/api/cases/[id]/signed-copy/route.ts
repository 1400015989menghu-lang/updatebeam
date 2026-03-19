import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { markSignedCopyReceived } from "@/services/case-service";

// POST /api/cases/[id]/signed-copy - Mark signed copy as received
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: caseId } = await params;

    await markSignedCopyReceived(caseId, session.id);

    return NextResponse.json({
      success: true,
      message: "Signed copy marked as received",
    });
  } catch (error) {
    console.error("Error marking signed copy received:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to mark signed copy as received";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
