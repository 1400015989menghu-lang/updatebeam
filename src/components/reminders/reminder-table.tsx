"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReminderDetail } from "./reminder-detail";
import { REMINDER_CHANNEL, REMINDER_STATUS, REMINDER_TYPES } from "@/lib/constants";
import { CheckCircle, Send, StopCircle, Mail, MessageSquare, Loader2 } from "lucide-react";

interface Reminder {
  id: string;
  caseId: string;
  caseName: string;
  clientName: string;
  channel: keyof typeof REMINDER_CHANNEL;
  type: keyof typeof REMINDER_TYPES;
  status: keyof typeof REMINDER_STATUS;
  scheduledDate: string;
  escalationLevel?: number;
  subject?: string;
  body: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

interface ReminderTableProps {
  reminders: Reminder[];
  loading?: boolean;
  onRefresh?: () => void;
}

const STATUS_COLORS: Record<keyof typeof REMINDER_STATUS, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DRAFTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  SENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  STOPPED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const TYPE_LABELS: Record<keyof typeof REMINDER_TYPES, string> = {
  AR_1ST: "AR 1st",
  AR_2ND: "AR 2nd",
  AR_3RD: "AR 3rd",
  FS_1ST: "FS 1st",
  FS_2ND: "FS 2nd",
  FS_3RD: "FS 3rd",
  PAYMENT: "Payment",
  DEBT_CURRENT: "Debt (Current)",
  DEBT_PRIOR: "Debt (Prior)",
  DOCUMENT_REQUEST: "Doc Request",
  GENERAL: "General",
};

export function ReminderTable({ reminders, loading, onRefresh }: ReminderTableProps) {
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleQuickAction = async (
    reminderId: string,
    action: "APPROVE" | "SEND" | "STOP"
  ) => {
    setActionLoading(reminderId);
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error("Failed to update reminder");
      }

      onRefresh?.();
    } catch (error) {
      console.error("Failed to update reminder:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDetailAction = async (
    reminderId: string,
    action: "APPROVE" | "SEND" | "STOP" | "UPDATE",
    data?: { subject?: string; body?: string }
  ) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update reminder");
      }

      setSelectedReminder(null);
      onRefresh?.();
    } catch (error) {
      console.error("Failed to update reminder:", error);
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Escalation</TableHead>
              <TableHead className="w-[200px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : reminders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No reminders found
                </TableCell>
              </TableRow>
            ) : (
              reminders.map((reminder) => {
                const canApprove = reminder.status === "DRAFTED";
                const canSend = reminder.status === "APPROVED" || reminder.status === "SCHEDULED";
                const canStop = ["DRAFTED", "APPROVED", "SCHEDULED"].includes(reminder.status);
                const isActionLoading = actionLoading === reminder.id;

                return (
                  <TableRow key={reminder.id} className="hover:bg-muted/50">
                    <TableCell>
                      <a
                        href={`/cases/${reminder.caseId}`}
                        className="text-sm text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {reminder.caseName}
                      </a>
                    </TableCell>
                    <TableCell className="font-medium">{reminder.clientName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {reminder.channel === "EMAIL" ? (
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">
                          {reminder.channel === "EMAIL" ? "Email" : "WhatsApp"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{TYPE_LABELS[reminder.type]}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(reminder.scheduledDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[reminder.status]}>
                        {reminder.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {reminder.escalationLevel !== undefined ? (
                        <Badge variant="outline">{reminder.escalationLevel}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canApprove && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction(reminder.id, "APPROVE")}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {canSend && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction(reminder.id, "SEND")}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {canStop && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction(reminder.id, "STOP")}
                            disabled={isActionLoading}
                          >
                            {isActionLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <StopCircle className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReminder(reminder)}
                          disabled={isActionLoading}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      {selectedReminder && (
        <ReminderDetail
          reminder={selectedReminder}
          open={!!selectedReminder}
          onOpenChange={(open) => !open && setSelectedReminder(null)}
          onAction={(action, data) => handleDetailAction(selectedReminder.id, action, data)}
        />
      )}
    </>
  );
}
