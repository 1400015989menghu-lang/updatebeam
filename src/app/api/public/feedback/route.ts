import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { createFeedbackSubmission } from "@/lib/monitoring-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const feedback = await createFeedbackSubmission(body);
    return jsonResponse({
      accepted: true,
      id: feedback.id,
      status: feedback.status,
    }, 201);
  } catch (error) {
    console.error("Feedback submission failed:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to submit feedback.",
      400,
    );
  }
}
