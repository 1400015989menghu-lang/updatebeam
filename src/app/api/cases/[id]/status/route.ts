import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { updateCaseStatus } from "@/services/case-service";

// PUT /api/cases/[id]/status - Update case status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: caseId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    await updateCaseStatus(caseId, status, session.id);

    return NextResponse.json({
      success: true,
      message: "Case status updated successfully",
      status,
    });
  } catch (error) {
    console.error("Error updating case status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update case status";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
