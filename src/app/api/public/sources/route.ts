import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { listPublicTrackedSources } from "@/lib/monitoring-service";

export async function GET() {
  try {
    const sources = await listPublicTrackedSources();
    return jsonResponse({
      sources,
    });
  } catch (error) {
    console.error("Error fetching public tracked sources:", error);
    return errorResponse("Failed to fetch sources.", 500);
  }
}
