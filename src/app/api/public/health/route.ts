import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteName } from "@/lib/public-site";

export async function GET() {
  try {
    const [sourceCount, activeSourceCount, activeSubscriberCount] = await Promise.all([
      prisma.trackedSource.count(),
      prisma.trackedSource.count({ where: { isActive: true, isPublic: true } }),
      prisma.emailSubscriber.count({ where: { status: "active" } }),
    ]);

    return NextResponse.json(
      {
        status: "ok",
        app: siteName,
        timestamp: new Date().toISOString(),
        checks: {
          database: "ok",
          resendConfigured: Boolean(process.env.RESEND_API_KEY),
          appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL),
        },
        metrics: {
          sourceCount,
          activeSourceCount,
          activeSubscriberCount,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        app: siteName,
        timestamp: new Date().toISOString(),
        checks: {
          database: "error",
          resendConfigured: Boolean(process.env.RESEND_API_KEY),
          appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL),
        },
        error: error instanceof Error ? error.message : "Unknown health check error",
      },
      { status: 500 },
    );
  }
}
