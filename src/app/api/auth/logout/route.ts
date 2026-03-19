import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST() {
  const session = await getSession();

  if (session) {
    await logAuditEvent({
      userId: session.id,
      action: "USER_LOGOUT",
      entityType: "User",
      entityId: session.id,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("openclaw-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
