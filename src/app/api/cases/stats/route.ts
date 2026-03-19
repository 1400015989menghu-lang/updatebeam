import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getCaseSummaryStats } from "@/services/case-service";

// GET /api/cases/stats - Get case summary statistics for dashboard
export async function GET(req: NextRequest) {
  try {
    await requireSession();

    const stats = await getCaseSummaryStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching case stats:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch case statistics";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
