import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, withAuth } from "@/lib/api-helpers";
import { logAuditEvent } from "@/lib/audit-logger";

// POST /api/documents/upload - Handle multipart file upload
export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const caseId = formData.get("caseId") as string;
      const category = formData.get("category") as string;
      const isSensitive = formData.get("isSensitive") === "true";

      if (!file) {
        return errorResponse("No file provided", 400);
      }

      if (!caseId) {
        return errorResponse("Case ID is required", 400);
      }

      // Verify case exists
      const caseExists = await prisma.case.findUnique({
        where: { id: caseId },
        select: { id: true, caseNumber: true },
      });

      if (!caseExists) {
        return errorResponse("Case not found", 404);
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = join(process.cwd(), "public", "uploads", caseId);
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.name;
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${timestamp}-${sanitizedName}`;
      const filePath = join(uploadsDir, fileName);
      const relativePath = `/uploads/${caseId}/${fileName}`;

      // Write file to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Create document record
      const document = await prisma.document.create({
        data: {
          caseId,
          fileName: originalName,
          fileType: file.type || "application/octet-stream",
          filePath: relativePath,
          fileSize: file.size,
          category,
          isSensitive,
          uploadedById: session.id,
          status: "RECEIVED",
        },
      });

      await logAuditEvent({
        userId: session.id,
        caseId,
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: document.id,
        details: {
          fileName: originalName,
          fileSize: file.size,
          caseNumber: caseExists.caseNumber,
        },
      });

      return jsonResponse(document, 201);
    } catch (error) {
      console.error("Error uploading document:", error);
      return errorResponse("Failed to upload document", 500);
    }
  });
}
