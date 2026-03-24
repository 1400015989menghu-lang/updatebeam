import { NextRequest } from "next/server";
import { errorResponse, jsonResponse } from "@/lib/api-helpers";
import { createPendingSubscription } from "@/lib/monitoring-service";
import { sendSubscriptionConfirmationEmail } from "@/lib/monitoring";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createPendingSubscription(body);

    await sendSubscriptionConfirmationEmail({
      email: result.subscriber.email,
      sourceNames: result.sources.map((source) => source.name),
      token: result.token,
      timezone: result.subscriber.timezone,
      preferredSendHour: result.subscriber.preferredSendHour,
      preferredSendMinute: result.subscriber.preferredSendMinute,
    });

    return jsonResponse({
      accepted: true,
      status: "confirmation_pending",
      email: result.subscriber.email,
      sourceCount: result.sources.length,
    });
  } catch (error) {
    console.error("Public subscribe failed:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create subscription.",
      400,
    );
  }
}
