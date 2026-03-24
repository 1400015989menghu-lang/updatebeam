import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { createSourceSubmission } from "@/lib/monitoring-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const submission = await createSourceSubmission(body);
    return jsonResponse({
      accepted: true,
      id: submission.id,
      status: submission.status,
    }, 201);
  } catch (error) {
    console.error("Source submission failed:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to submit source request.",
      400,
    );
  }
}
