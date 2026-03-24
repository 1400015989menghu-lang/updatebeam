import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { unsubscribeByToken } from "@/lib/monitoring-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await unsubscribeByToken(body);
    return jsonResponse(result, result.status === "success" ? 200 : 400);
  } catch (error) {
    console.error("Unsubscribe failed:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to unsubscribe.",
      400,
    );
  }
}
