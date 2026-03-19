import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { markOriginalSignedReceived } from "@/services/case-service";

// POST /api/cases/[id]/original-signed - Mark original signed document as received
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: caseId } = await params;

    await markOriginalSignedReceived(caseId, session.id);

    return NextResponse.json({
      success: true,
      message: "Original signed document marked as received",
    });
  } catch (error) {
    console.error("Error marking original signed received:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to mark original signed as received";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
