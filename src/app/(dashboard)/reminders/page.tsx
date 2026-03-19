"use client";

import { useEffect, useState } from "react";
import { ReminderTable } from "@/components/reminders/reminder-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { REMINDER_CHANNEL, REMINDER_TYPES } from "@/lib/constants";
import { RefreshCw, Filter } from "lucide-react";

interface Reminder {
  id: string;
  caseId: string;
  caseName: string;
  clientName: string;
  channel: keyof typeof REMINDER_CHANNEL;
  type: keyof typeof REMINDER_TYPES;
  status: "SCHEDULED" | "DRAFTED" | "APPROVED" | "SENT" | "DELIVERED" | "FAILED" | "STOPPED";
  scheduledDate: string;
  escalationLevel?: number;
  subject?: string;
  body: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Filters
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchReminders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();

      // Add tab filter
      if (activeTab !== "all") {
        if (activeTab === "upcoming") {
          params.append("status", "SCHEDULED,DRAFTED,APPROVED");
        } else if (activeTab === "sent") {
          params.append("status", "SENT,DELIVERED");
        } else if (activeTab === "stopped") {
          params.append("status", "STOPPED");
        }
      }

      // Add other filters
      if (channelFilter !== "all") {
        params.append("channel", channelFilter);
      }
      if (typeFilter !== "all") {
        params.append("type", typeFilter);
      }
      if (dateFrom) {
        params.append("dateFrom", dateFrom);
      }
      if (dateTo) {
        params.append("dateTo", dateTo);
      }

      const response = await fetch(`/api/reminders?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reminders");
      }
      const data = await response.json();
      setReminders(data.reminders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Failed to fetch reminders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [activeTab, channelFilter, typeFilter, dateFrom, dateTo]);

  const filterByTab = (reminder: Reminder) => {
    switch (activeTab) {
      case "upcoming":
        return ["SCHEDULED", "DRAFTED", "APPROVED"].includes(reminder.status);
      case "sent":
        return ["SENT", "DELIVERED"].includes(reminder.status);
      case "stopped":
        return reminder.status === "STOPPED";
      default:
        return true;
    }
  };

  const filteredReminders = reminders.filter(filterByTab);

  const upcomingCount = reminders.filter((r) =>
    ["SCHEDULED", "DRAFTED", "APPROVED"].includes(r.status)
  ).length;
  const sentCount = reminders.filter((r) =>
    ["SENT", "DELIVERED"].includes(r.status)
  ).length;
  const stoppedCount = reminders.filter((r) => r.status === "STOPPED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminder Center</h1>
          <p className="text-muted-foreground">
            Manage automated client reminders and communications
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReminders}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v ?? "all")}>
            <SelectTrigger>
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.keys(REMINDER_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From Date"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To Date"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming {upcomingCount > 0 && `(${upcomingCount})`}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent {sentCount > 0 && `(${sentCount})`}
          </TabsTrigger>
          <TabsTrigger value="stopped">
            Stopped {stoppedCount > 0 && `(${stoppedCount})`}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <ReminderTable
            reminders={filteredReminders}
            loading={loading}
            onRefresh={fetchReminders}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
