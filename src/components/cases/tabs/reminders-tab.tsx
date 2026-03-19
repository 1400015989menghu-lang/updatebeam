"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReminderStatusBadge } from "@/components/cases/case-status-badge";
import { formatDateTime } from "@/lib/utils/case-utils";
import { Plus, Mail, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface Reminder {
  id: number;
  type: string;
  channel: string;
  status: string;
  scheduledDate: string;
  sentDate: string | null;
  message: string;
  createdBy: string;
}

interface RemindersTabProps {
  caseId: number;
}

export function RemindersTab({ caseId }: RemindersTabProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReminders() {
      try {
        const response = await fetch(`/api/cases/${caseId}/reminders`);
        if (response.ok) {
          const data = await response.json();
          setReminders(data.reminders || []);
        }
      } catch (err) {
        console.error("Failed to fetch reminders:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReminders();
  }, [caseId]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "EMAIL":
        return <Mail className="h-4 w-4" />;
      case "WHATSAPP":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Reminder
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : reminders.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No reminders created yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder, index) => (
            <div key={reminder.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  reminder.status === "SENT" || reminder.status === "DELIVERED"
                    ? "bg-green-100 text-green-600"
                    : reminder.status === "FAILED"
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-100 text-blue-600"
                }`}>
                  {getChannelIcon(reminder.channel)}
                </div>
                {index < reminders.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>}
              </div>
              <Card className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{reminder.type.replace(/_/g, " ")}</span>
                      <ReminderStatusBadge status={reminder.status} />
                    </div>
                    <p className="text-sm text-gray-600">
                      {reminder.channel} • Created by {reminder.createdBy}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">{reminder.message}</p>
                <div className="flex gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Scheduled:</span> {formatDateTime(reminder.scheduledDate)}
                  </div>
                  {reminder.sentDate && (
                    <div>
                      <span className="font-medium">Sent:</span> {formatDateTime(reminder.sentDate)}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
