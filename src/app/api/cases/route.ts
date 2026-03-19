import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth, generateCaseNumber } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/cases - List cases with filters and pagination
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const department = searchParams.get("department");
      const status = searchParams.get("status");
      const caseType = searchParams.get("caseType");
      const priority = searchParams.get("priority");
      const search = searchParams.get("search") || "";
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const skip = (page - 1) * limit;

      const where: any = {};

      if (department) where.department = department;
      if (status) where.status = status;
      if (caseType) where.caseType = caseType;
      if (priority) where.priority = priority;

      if (search) {
        where.OR = [
          { caseNumber: { contains: search, mode: "insensitive" as const } },
          { title: { contains: search, mode: "insensitive" as const } },
          { client: { name: { contains: search, mode: "insensitive" as const } } },
        ];
      }

      const [cases, total] = await Promise.all([
        prisma.case.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            client: {
              select: { id: true, name: true },
            },
            owner: {
              select: { id: true, name: true, email: true },
            },
            _count: {
              select: {
                documents: true,
                tasks: true,
                reminders: true,
              },
            },
          },
        }),
        prisma.case.count({ where }),
      ]);

      return jsonResponse({
        cases,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching cases:", error);
      return errorResponse("Failed to fetch cases", 500);
    }
  });
}

// POST /api/cases - Create a new case
export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await request.json();
      const {
        clientId,
        engagementId,
        title,
        description,
        department,
        caseType,
        status,
        priority,
        dueDate,
        anniversaryDate,
        financialYearEnd,
        paymentStatus,
        outstandingAmount,
      } = body;

      if (!clientId || !title || !department || !caseType) {
        return errorResponse("Missing required fields", 400);
      }

      // Auto-generate case number
      const caseNumber = generateCaseNumber(department);

      const newCase = await prisma.case.create({
        data: {
          caseNumber,
          clientId,
          engagementId,
          ownerId: session.id,
          title,
          description,
          department,
          caseType,
          status: status || "DRAFT",
          priority: priority || "NORMAL",
          dueDate: dueDate ? new Date(dueDate) : null,
          anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
          financialYearEnd: financialYearEnd ? new Date(financialYearEnd) : null,
          paymentStatus: paymentStatus || "NOT_APPLICABLE",
          outstandingAmount,
        },
        include: {
          client: true,
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId: newCase.id,
        action: "CASE_CREATED",
        entityType: "Case",
        entityId: newCase.id,
        details: { caseNumber: newCase.caseNumber, title: newCase.title },
      });

      return jsonResponse(newCase, 201);
    } catch (error) {
      console.error("Error creating case:", error);
      return errorResponse("Failed to create case", 500);
    }
  });
}
