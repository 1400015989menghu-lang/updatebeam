import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { checkStopConditions } from "@/services/reminder-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: caseId } = await params;

    const result = await checkStopConditions(caseId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error checking stop conditions:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to check stop conditions";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
