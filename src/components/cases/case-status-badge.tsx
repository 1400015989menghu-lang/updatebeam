import { Badge } from "@/components/ui/badge";
import { getCaseStatusColor, getPriorityColor, getPaymentStatusColor, getDocumentStatusColor, getReminderStatusColor } from "@/lib/utils/case-utils";
import { CASE_STATUS_LABELS } from "@/lib/constants";

interface CaseStatusBadgeProps {
  status: string;
  variant?: "default";
}

export function CaseStatusBadge({ status, variant = "default" }: CaseStatusBadgeProps) {
  const colorClass = getCaseStatusColor(status);
  const label = CASE_STATUS_LABELS[status] || status;

  return (
    <Badge variant={variant} className={`${colorClass} border font-medium`}>
      {label}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colorClass = getPriorityColor(priority);
  const label = priority.charAt(0) + priority.slice(1).toLowerCase();

  return (
    <Badge className={`${colorClass} border font-medium`}>
      {label}
    </Badge>
  );
}

interface PaymentStatusBadgeProps {
  status: string;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const colorClass = getPaymentStatusColor(status);
  const label = status.split("_").map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(" ");

  return (
    <Badge className={`${colorClass} border font-medium`}>
      {label}
    </Badge>
  );
}

interface DocumentStatusBadgeProps {
  status: string;
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const colorClass = getDocumentStatusColor(status);
  const label = status.split("_").map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(" ");

  return (
    <Badge className={`${colorClass} border font-medium text-xs`}>
      {label}
    </Badge>
  );
}

interface ReminderStatusBadgeProps {
  status: string;
}

export function ReminderStatusBadge({ status }: ReminderStatusBadgeProps) {
  const colorClass = getReminderStatusColor(status);
  const label = status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <Badge className={`${colorClass} border font-medium text-xs`}>
      {label}
    </Badge>
  );
}
