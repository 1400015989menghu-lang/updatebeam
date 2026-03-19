import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonResponse, errorResponse, withRole } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// GET /api/admin/users - List all users (admin only)
export async function GET(request: NextRequest) {
  return withRole(["ADMIN"], async (session) => {
    try {
      const { searchParams } = new URL(request.url);
      const role = searchParams.get("role");
      const department = searchParams.get("department");
      const isActive = searchParams.get("isActive");

      const where: any = {};

      if (role) where.role = role;
      if (department) where.department = department;
      if (isActive !== null) where.isActive = isActive === "true";

      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { ownedCases: true },
          },
        },
      });

      return jsonResponse({ users });
    } catch (error) {
      console.error("Error fetching users:", error);
      return errorResponse("Failed to fetch users", 500);
    }
  });
}

// POST /api/admin/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  return withRole(["ADMIN"], async (session) => {
    try {
      const body = await request.json();
      const { email, name, password, role, department, isActive } = body;

      if (!email || !name || !password || !role) {
        return errorResponse("Missing required fields", 400);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return errorResponse("User with this email already exists", 400);
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role,
          department,
          isActive: isActive !== undefined ? isActive : true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          isActive: true,
          createdAt: true,
        },
      });

      await logAuditEvent({
        userId: session.id,
        action: "USER_CREATED",
        entityType: "User",
        entityId: user.id,
        details: { email: user.email, name: user.name, role: user.role },
      });

      return jsonResponse(user, 201);
    } catch (error) {
      console.error("Error creating user:", error);
      return errorResponse("Failed to create user", 500);
    }
  });
}
