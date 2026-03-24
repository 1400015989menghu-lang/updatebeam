import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { getManageSession, updateManagedSubscription } from "@/lib/monitoring-service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return errorResponse("Missing manage token.", 400);
  }

  try {
    const result = await getManageSession({ token });
    return jsonResponse(result, result.status === "success" ? 200 : 400);
  } catch (error) {
    console.error("Manage session lookup failed:", error);
    return errorResponse("Failed to load subscription settings.", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await updateManagedSubscription(body);
    return jsonResponse(result, result.status === "success" ? 200 : 400);
  } catch (error) {
    console.error("Manage update failed:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update subscription settings.",
      400,
    );
  }
}
