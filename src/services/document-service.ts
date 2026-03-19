import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-logger";
import { DOCUMENT_STATUS } from "@/lib/constants";

const VALID_DOCUMENT_STATUSES: string[] = Object.values(DOCUMENT_STATUS);

/**
 * Update document status with validation and audit logging
 */
export async function updateDocumentStatus(
  documentId: string,
  newStatus: string,
  userId: string
): Promise<void> {
  // Validate status
  if (!VALID_DOCUMENT_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid document status: ${newStatus}`);
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  const oldStatus = document.status;

  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: newStatus,
      ...(newStatus === DOCUMENT_STATUS.ARCHIVED && !document.archivedAt
        ? { archivedAt: new Date() }
        : {}),
    },
  });

  await logAuditEvent({
    userId,
    caseId: document.caseId,
    action: "DOCUMENT_STATUS_CHANGED",
    entityType: "Document",
    entityId: documentId,
    details: {
      oldStatus,
      newStatus,
      fileName: document.fileName,
    },
  });
}

/**
 * Get list of missing/required documents for a case
 * This returns documents that are marked as REQUESTED but not yet RECEIVED
 */
export async function getMissingDocuments(caseId: string): Promise<Array<{
  id: string;
  fileName: string;
  fileType: string;
  category: string | null;
  status: string;
}>> {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  // Get all documents that are requested but not received
  const missingDocuments = await prisma.document.findMany({
    where: {
      caseId,
      status: DOCUMENT_STATUS.REQUESTED,
      archivedAt: null,
    },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      category: true,
      status: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return missingDocuments;
}

/**
 * Get required document types for a specific case type
 * This is a helper function that defines what documents are typically required
 * based on case type and department. In a production system, this might come
 * from a configuration table or business rules engine.
 */
export function getRequiredDocumentTypes(caseType: string, department: string): string[] {
  const requirementMap: Record<string, Record<string, string[]>> = {
    SECRETARIAL: {
      AR: ["IC_CARD", "PASSPORT", "RESOLUTION", "ENGAGEMENT_LETTER"],
      INCORPORATION: ["IC_CARD", "PASSPORT", "RESOLUTION"],
    },
    ACCOUNTING: {
      FS: ["BANK_STATEMENT", "INVOICE", "PAYMENT_VOUCHER", "ENGAGEMENT_LETTER"],
    },
    TAX: {
      TAX_FILING: ["EA_FORM", "FORM_E", "BANK_STATEMENT", "ENGAGEMENT_LETTER"],
    },
    AUDIT: {
      AUDIT: ["AUDITED_REPORT", "BANK_STATEMENT", "ENGAGEMENT_LETTER"],
    },
  };

  const deptRequirements = requirementMap[department];
  if (!deptRequirements) {
    return [];
  }

  return deptRequirements[caseType] || [];
}

/**
 * Check document completeness for a case
 * Returns whether all required documents have been received
 */
export async function checkDocumentCompleteness(caseId: string): Promise<{
  isComplete: boolean;
  requiredCount: number;
  receivedCount: number;
  missingDocuments: Array<{
    id: string;
    fileName: string;
    category: string | null;
  }>;
}> {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  // Get required document types
  const requiredTypes = getRequiredDocumentTypes(caseData.caseType, caseData.department);
  const requiredCount = requiredTypes.length;

  // Get all documents for the case
  const documents = await prisma.document.findMany({
    where: {
      caseId,
      archivedAt: null,
    },
  });

  // Count how many required types have been received
  const receivedTypes = new Set(
    documents
      .filter(doc =>
        doc.status === DOCUMENT_STATUS.RECEIVED ||
        doc.status === DOCUMENT_STATUS.CLASSIFIED ||
        doc.status === DOCUMENT_STATUS.OCR_PROCESSED ||
        doc.status === DOCUMENT_STATUS.REVIEWED ||
        doc.status === DOCUMENT_STATUS.SIGNED_RECEIVED ||
        doc.status === DOCUMENT_STATUS.ORIGINAL_RECEIVED
      )
      .map(doc => doc.category)
      .filter(Boolean)
  );

  const receivedCount = receivedTypes.size;

  // Get missing documents
  const missingDocuments = await getMissingDocuments(caseId);

  return {
    isComplete: requiredCount > 0 && receivedCount >= requiredCount,
    requiredCount,
    receivedCount,
    missingDocuments: missingDocuments.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      category: doc.category,
    })),
  };
}
