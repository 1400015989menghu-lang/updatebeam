import { CASE_STATUS, PRIORITY, PAYMENT_STATUS, DOCUMENT_STATUS, REMINDER_STATUS } from "@/lib/constants";

export function getCaseStatusColor(status: string): string {
  switch (status) {
    case CASE_STATUS.ACTIVE:
      return "bg-green-100 text-green-800 border-green-200";
    case CASE_STATUS.AWAITING_CLIENT:
    case CASE_STATUS.AWAITING_INTERNAL_REVIEW:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case CASE_STATUS.BLOCKED:
      return "bg-red-100 text-red-800 border-red-200";
    case CASE_STATUS.SUBMITTED:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case CASE_STATUS.READY_FOR_SUBMISSION:
      return "bg-purple-100 text-purple-800 border-purple-200";
    case CASE_STATUS.DRAFT:
      return "bg-gray-100 text-gray-800 border-gray-200";
    case CASE_STATUS.ARCHIVED:
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case PRIORITY.URGENT:
      return "bg-red-100 text-red-800 border-red-200";
    case PRIORITY.HIGH:
      return "bg-orange-100 text-orange-800 border-orange-200";
    case PRIORITY.NORMAL:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case PRIORITY.LOW:
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case PAYMENT_STATUS.PAID:
      return "bg-green-100 text-green-800 border-green-200";
    case PAYMENT_STATUS.PARTIAL:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case PAYMENT_STATUS.OVERDUE:
      return "bg-red-100 text-red-800 border-red-200";
    case PAYMENT_STATUS.PENDING:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case PAYMENT_STATUS.NOT_APPLICABLE:
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getDocumentStatusColor(status: string): string {
  switch (status) {
    case DOCUMENT_STATUS.REVIEWED:
    case DOCUMENT_STATUS.SIGNED_RECEIVED:
    case DOCUMENT_STATUS.ORIGINAL_RECEIVED:
      return "bg-green-100 text-green-800 border-green-200";
    case DOCUMENT_STATUS.REQUESTED:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case DOCUMENT_STATUS.RECEIVED:
    case DOCUMENT_STATUS.CLASSIFIED:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case DOCUMENT_STATUS.OCR_PROCESSED:
      return "bg-purple-100 text-purple-800 border-purple-200";
    case DOCUMENT_STATUS.DELETED:
      return "bg-red-100 text-red-800 border-red-200";
    case DOCUMENT_STATUS.ARCHIVED:
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getReminderStatusColor(status: string): string {
  switch (status) {
    case REMINDER_STATUS.SENT:
    case REMINDER_STATUS.DELIVERED:
      return "bg-green-100 text-green-800 border-green-200";
    case REMINDER_STATUS.SCHEDULED:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case REMINDER_STATUS.DRAFTED:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case REMINDER_STATUS.APPROVED:
      return "bg-purple-100 text-purple-800 border-purple-200";
    case REMINDER_STATUS.FAILED:
      return "bg-red-100 text-red-800 border-red-200";
    case REMINDER_STATUS.STOPPED:
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "RM 0.00";
  return `RM ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function isOverdue(dueDate: string | Date | null | undefined): boolean {
  if (!dueDate) return false;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return due < new Date();
}
