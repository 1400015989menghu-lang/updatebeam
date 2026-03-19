import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { updateDocumentStatus } from "@/services/document-service";

// PUT /api/documents/[id]/status - Update document status
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: documentId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    await updateDocumentStatus(documentId, status, session.id);

    return NextResponse.json({
      success: true,
      message: "Document status updated successfully",
      status,
    });
  } catch (error) {
    console.error("Error updating document status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update document status";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
