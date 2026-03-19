import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { updatePaymentStatus } from "@/services/case-service";

// PUT /api/cases/[id]/payment - Update payment status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: caseId } = await params;
    const body = await req.json();
    const { status, amount } = body;

    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "Payment status is required" },
        { status: 400 }
      );
    }

    const amountValue = amount !== null && amount !== undefined ? parseFloat(amount) : null;

    await updatePaymentStatus(caseId, status, amountValue, session.id);

    return NextResponse.json({
      success: true,
      message: "Payment status updated successfully",
      paymentStatus: status,
      outstandingAmount: amountValue,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update payment status";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
