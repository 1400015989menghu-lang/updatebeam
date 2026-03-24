import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { confirmSubscriptionToken } from "@/lib/monitoring-service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return errorResponse("Missing confirmation token.", 400);
  }

  try {
    const result = await confirmSubscriptionToken(token);
    return jsonResponse(result, result.status === "success" || result.status === "already-confirmed" ? 200 : 400);
  } catch (error) {
    console.error("Subscription confirmation failed:", error);
    return errorResponse("Failed to confirm subscription.", 500);
  }
}
