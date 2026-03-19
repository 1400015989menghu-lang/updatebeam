import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";

// GET /api/dashboard - Get dashboard summary data
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const now = new Date();

      // Overdue cases (past due date and not completed/archived)
      const overdueCases = await prisma.case.count({
        where: {
          dueDate: { lt: now },
          status: { notIn: ["COMPLETED", "ARCHIVED"] },
          archivedAt: null,
        },
      });

      // Cases awaiting client (status = AWAITING_CLIENT)
      const awaitingClient = await prisma.case.count({
        where: {
          status: "AWAITING_CLIENT",
          archivedAt: null,
        },
      });

      // Pending reminders (scheduled but not sent/stopped/failed)
      const pendingReminders = await prisma.reminderEvent.count({
        where: {
          status: { in: ["SCHEDULED", "APPROVED"] },
          scheduledAt: { lte: now },
        },
      });

      // Payment watchlist (cases with outstanding payments)
      const paymentWatchlist = await prisma.case.count({
        where: {
          paymentStatus: { in: ["PENDING", "OVERDUE"] },
          archivedAt: null,
        },
      });

      // Review backlog (items with status = NEW or NEEDS_MORE_INFO)
      const reviewBacklog = await prisma.reviewItem.count({
        where: {
          status: { in: ["NEW", "NEEDS_MORE_INFO"] },
        },
      });

      // Total active cases
      const activeCases = await prisma.case.count({
        where: {
          status: { notIn: ["COMPLETED", "ARCHIVED"] },
          archivedAt: null,
        },
      });

      // Cases by department
      const casesByDepartment = await prisma.case.groupBy({
        by: ["department"],
        where: {
          archivedAt: null,
          status: { notIn: ["COMPLETED", "ARCHIVED"] },
        },
        _count: { id: true },
      });

      // Recent cases (last 5)
      const recentCases = await prisma.case.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: { id: true, name: true },
          },
          owner: {
            select: { id: true, name: true },
          },
        },
      });

      return jsonResponse({
        summary: {
          overdueCases,
          awaitingClient,
          pendingReminders,
          paymentWatchlist,
          reviewBacklog,
          activeCases,
        },
        casesByDepartment: casesByDepartment.map((item) => ({
          department: item.department,
          count: item._count.id,
        })),
        recentCases,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return errorResponse("Failed to fetch dashboard data", 500);
    }
  });
}
