import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/clients - List clients with search and pagination
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get("search") || "";
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "10");
      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { registrationNo: { contains: search, mode: "insensitive" as const } },
              { businessType: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            contacts: {
              where: { isPrimary: true },
              take: 1,
            },
            _count: {
              select: { cases: true },
            },
          },
        }),
        prisma.client.count({ where }),
      ]);

      return jsonResponse({
        clients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching clients:", error);
      return errorResponse("Failed to fetch clients", 500);
    }
  });
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const body = await request.json();
      const {
        name,
        businessType,
        registrationNo,
        incorporationDate,
        anniversaryDate,
        financialYearEnd,
        taxAgentCode,
        contacts,
      } = body;

      if (!name) {
        return errorResponse("Client name is required", 400);
      }

      const client = await prisma.client.create({
        data: {
          name,
          businessType,
          registrationNo,
          incorporationDate: incorporationDate ? new Date(incorporationDate) : null,
          anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
          financialYearEnd: financialYearEnd ? new Date(financialYearEnd) : null,
          taxAgentCode,
          contacts: contacts
            ? {
                create: contacts.map((contact: any) => ({
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone,
                  whatsapp: contact.whatsapp,
                  role: contact.role,
                  isPrimary: contact.isPrimary || false,
                })),
              }
            : undefined,
        },
        include: {
          contacts: true,
        },
      });

      await logAuditEvent({
        userId: session.id,
        action: "CLIENT_CREATED",
        entityType: "Client",
        entityId: client.id,
        details: { name: client.name },
      });

      return jsonResponse(client, 201);
    } catch (error) {
      console.error("Error creating client:", error);
      return errorResponse("Failed to create client", 500);
    }
  });
}
