"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReminderPreview } from "./reminder-preview";
import { REMINDER_CHANNEL, REMINDER_STATUS, REMINDER_TYPES } from "@/lib/constants";
import { CheckCircle, Send, StopCircle, Edit3, History } from "lucide-react";

interface ReminderHistory {
  id: string;
  action: string;
  timestamp: string;
  performedBy: string;
  notes?: string;
}

interface ReminderDetailProps {
  reminder: {
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
    history?: ReminderHistory[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: "APPROVE" | "SEND" | "STOP" | "UPDATE", data?: { subject?: string; body?: string }) => Promise<void>;
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
  AR_1ST: "AR 1st Reminder",
  AR_2ND: "AR 2nd Reminder",
  AR_3RD: "AR 3rd Reminder",
  FS_1ST: "FS 1st Reminder",
  FS_2ND: "FS 2nd Reminder",
  FS_3RD: "FS 3rd Reminder",
  PAYMENT: "Payment Reminder",
  DEBT_CURRENT: "Current Debt",
  DEBT_PRIOR: "Prior Debt",
  DOCUMENT_REQUEST: "Document Request",
  GENERAL: "General",
};

export function ReminderDetail({ reminder, open, onOpenChange, onAction }: ReminderDetailProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [editedSubject, setEditedSubject] = useState(reminder.subject || "");
  const [editedBody, setEditedBody] = useState(reminder.body);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleAction = async (action: "APPROVE" | "SEND" | "STOP" | "UPDATE") => {
    setLoading(true);
    try {
      if (action === "UPDATE") {
        await onAction(action, { subject: editedSubject, body: editedBody });
        setMode("view");
      } else {
        await onAction(action);
      }
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canApprove = reminder.status === "DRAFTED";
  const canSend = reminder.status === "APPROVED" || reminder.status === "SCHEDULED";
  const canStop = ["DRAFTED", "APPROVED", "SCHEDULED"].includes(reminder.status);
  const canEdit = ["DRAFTED", "APPROVED"].includes(reminder.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Reminder Details</span>
            <Badge variant="outline" className={STATUS_COLORS[reminder.status]}>
              {reminder.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-6 pr-4">
            {/* Case & Client Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Case</Label>
                <div className="mt-1">
                  <a href={`/cases/${reminder.caseId}`} className="text-sm text-blue-600 hover:underline">
                    {reminder.caseName}
                  </a>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Client</Label>
                <div className="mt-1 text-sm font-medium">{reminder.clientName}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <div className="mt-1 text-sm">{TYPE_LABELS[reminder.type]}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Scheduled Date</Label>
                <div className="mt-1 text-sm">{formatDate(reminder.scheduledDate)}</div>
              </div>
              {reminder.escalationLevel !== undefined && (
                <div>
                  <Label className="text-xs text-muted-foreground">Escalation Level</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{reminder.escalationLevel}</Badge>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Channel</Label>
                <div className="mt-1">
                  <Badge variant="outline">
                    {reminder.channel === "EMAIL" ? "Email" : "WhatsApp"}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Content Editor or Preview */}
            {mode === "edit" ? (
              <div className="space-y-4">
                <div className="text-sm font-medium">Edit Reminder Content</div>
                {reminder.channel === "EMAIL" && (
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="body">Message Body</Label>
                  <Textarea
                    id="body"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="mt-1 min-h-[300px]"
                  />
                </div>
              </div>
            ) : (
              <ReminderPreview
                channel={reminder.channel}
                subject={reminder.subject}
                body={reminder.body}
                recipientName={reminder.clientName}
                recipientContact={reminder.channel === "EMAIL" ? reminder.recipientEmail : reminder.recipientPhone}
              />
            )}

            {/* History Section */}
            {reminder.history && reminder.history.length > 0 && (
              <>
                <Separator />
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full justify-start"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Reminder History ({reminder.history.length})
                  </Button>
                  {showHistory && (
                    <div className="mt-4 space-y-3">
                      {reminder.history.map((entry) => (
                        <div key={entry.id} className="p-3 bg-muted rounded-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-medium">{entry.action}</div>
                              <div className="text-xs text-muted-foreground">
                                by {entry.performedBy}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(entry.timestamp)}
                            </div>
                          </div>
                          {entry.notes && (
                            <div className="mt-2 text-xs text-muted-foreground">{entry.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          {mode === "view" ? (
            <div className="flex gap-2 w-full justify-end">
              {canStop && (
                <Button
                  variant="outline"
                  onClick={() => handleAction("STOP")}
                  disabled={loading}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditedSubject(reminder.subject || "");
                    setEditedBody(reminder.body);
                    setMode("edit");
                  }}
                  disabled={loading}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Content
                </Button>
              )}
              {canApprove && (
                <Button
                  onClick={() => handleAction("APPROVE")}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              )}
              {canSend && (
                <Button
                  onClick={() => handleAction("SEND")}
                  disabled={loading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </Button>
              )}
            </div>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setMode("view")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAction("UPDATE")}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
