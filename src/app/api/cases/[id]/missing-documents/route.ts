import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getMissingDocuments } from "@/services/document-service";

// GET /api/cases/[id]/missing-documents - Get list of missing documents for a case
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession();
    const { id: caseId } = await params;

    const missingDocuments = await getMissingDocuments(caseId);

    return NextResponse.json({
      success: true,
      count: missingDocuments.length,
      documents: missingDocuments,
    });
  } catch (error) {
    console.error("Error fetching missing documents:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch missing documents";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
