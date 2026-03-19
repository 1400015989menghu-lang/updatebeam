import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-logger";
import { CASE_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { checkStopConditions } from "./reminder-service";

const VALID_CASE_STATUSES: string[] = Object.values(CASE_STATUS);
const VALID_PAYMENT_STATUSES: string[] = Object.values(PAYMENT_STATUS);

/**
 * Update case status with validation and audit logging
 */
export async function updateCaseStatus(
  caseId: string,
  newStatus: string,
  userId: string
): Promise<void> {
  // Validate status
  if (!VALID_CASE_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid case status: ${newStatus}`);
  }

  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  const oldStatus = caseData.status;

  // Update case status
  await prisma.case.update({
    where: { id: caseId },
    data: {
      status: newStatus,
      ...(newStatus === CASE_STATUS.ARCHIVED && !caseData.archivedAt
        ? { archivedAt: new Date() }
        : {}),
    },
  });

  await logAuditEvent({
    userId,
    caseId,
    action: "CASE_STATUS_CHANGED",
    entityType: "Case",
    entityId: caseId,
    details: {
      oldStatus,
      newStatus,
    },
  });

  // If case is archived, check stop conditions
  if (newStatus === CASE_STATUS.ARCHIVED) {
    await checkStopConditions(caseId);
  }
}

/**
 * Update payment status and amount
 */
export async function updatePaymentStatus(
  caseId: string,
  status: string,
  amount: number | null,
  userId: string
): Promise<void> {
  // Validate payment status
  if (!VALID_PAYMENT_STATUSES.includes(status)) {
    throw new Error(`Invalid payment status: ${status}`);
  }

  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  const oldPaymentStatus = caseData.paymentStatus;
  const oldAmount = caseData.outstandingAmount;

  await prisma.case.update({
    where: { id: caseId },
    data: {
      paymentStatus: status,
      outstandingAmount: amount,
    },
  });

  await logAuditEvent({
    userId,
    caseId,
    action: "PAYMENT_STATUS_UPDATED",
    entityType: "Case",
    entityId: caseId,
    details: {
      oldPaymentStatus,
      newPaymentStatus: status,
      oldAmount,
      newAmount: amount,
    },
  });

  // If payment is now marked as PAID, check stop conditions
  if (status === PAYMENT_STATUS.PAID) {
    await checkStopConditions(caseId);
  }
}

/**
 * Mark signed copy as received
 */
export async function markSignedCopyReceived(caseId: string, userId: string): Promise<void> {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  if (caseData.signedCopyReceived) {
    throw new Error("Signed copy already marked as received");
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      signedCopyReceived: true,
    },
  });

  await logAuditEvent({
    userId,
    caseId,
    action: "SIGNED_COPY_RECEIVED",
    entityType: "Case",
    entityId: caseId,
    details: {
      signedCopyReceived: true,
    },
  });

  // Check stop conditions
  await checkStopConditions(caseId);
}

/**
 * Mark original signed document as received
 */
export async function markOriginalSignedReceived(caseId: string, userId: string): Promise<void> {
  const caseData = await prisma.case.findUnique({
    where: { id: caseId },
  });

  if (!caseData) {
    throw new Error("Case not found");
  }

  if (caseData.originalSignedReceived) {
    throw new Error("Original signed document already marked as received");
  }

  await prisma.case.update({
    where: { id: caseId },
    data: {
      originalSignedReceived: true,
    },
  });

  await logAuditEvent({
    userId,
    caseId,
    action: "ORIGINAL_SIGNED_RECEIVED",
    entityType: "Case",
    entityId: caseId,
    details: {
      originalSignedReceived: true,
    },
  });

  // Check stop conditions (this is important as it might trigger reminder stops)
  await checkStopConditions(caseId);
}

/**
 * Get case summary statistics for dashboard
 */
export async function getCaseSummaryStats(): Promise<{
  total: number;
  active: number;
  overdue: number;
  awaitingClient: number;
  blocked: number;
  pendingReminders: number;
  readyForSubmission: number;
}> {
  const now = new Date();

  // Total cases (excluding archived)
  const total = await prisma.case.count({
    where: {
      archivedAt: null,
    },
  });

  // Active cases
  const active = await prisma.case.count({
    where: {
      status: CASE_STATUS.ACTIVE,
      archivedAt: null,
    },
  });

  // Overdue cases (cases with dueDate in the past and not archived or submitted)
  const overdue = await prisma.case.count({
    where: {
      dueDate: {
        lt: now,
      },
      status: {
        notIn: [CASE_STATUS.SUBMITTED, CASE_STATUS.ARCHIVED],
      },
      archivedAt: null,
    },
  });

  // Awaiting client
  const awaitingClient = await prisma.case.count({
    where: {
      status: CASE_STATUS.AWAITING_CLIENT,
      archivedAt: null,
    },
  });

  // Blocked cases
  const blocked = await prisma.case.count({
    where: {
      status: CASE_STATUS.BLOCKED,
      archivedAt: null,
    },
  });

  // Pending reminders (scheduled but not sent)
  const pendingReminders = await prisma.reminderEvent.count({
    where: {
      status: {
        in: ["SCHEDULED", "DRAFTED", "APPROVED"],
      },
      case: {
        archivedAt: null,
      },
    },
  });

  // Ready for submission
  const readyForSubmission = await prisma.case.count({
    where: {
      status: CASE_STATUS.READY_FOR_SUBMISSION,
      archivedAt: null,
    },
  });

  return {
    total,
    active,
    overdue,
    awaitingClient,
    blocked,
    pendingReminders,
    readyForSubmission,
  };
}
