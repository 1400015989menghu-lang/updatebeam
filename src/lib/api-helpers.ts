import { NextResponse } from "next/server";
import { getSession, SessionUser } from "./auth";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  handler: (session: SessionUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return errorResponse("Unauthorized", 401);
  }
  return handler(session);
}

export async function withRole(
  allowedRoles: string[],
  handler: (session: SessionUser) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return errorResponse("Unauthorized", 401);
  }
  if (!allowedRoles.includes(session.role)) {
    return errorResponse("Forbidden", 403);
  }
  return handler(session);
}

export function generateCaseNumber(department: string): string {
  const prefix = department.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
