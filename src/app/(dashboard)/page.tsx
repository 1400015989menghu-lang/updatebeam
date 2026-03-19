"use client";

import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { OverdueTable } from "@/components/dashboard/overdue-table";
import { AwaitingClientList } from "@/components/dashboard/awaiting-client-list";
import { PaymentWatchlist } from "@/components/dashboard/payment-watchlist";
import { PendingReviewItems } from "@/components/dashboard/pending-review-items";
import { useEffect, useState } from "react";

interface DashboardData {
  stats: {
    totalCases: number;
    overdueCases: number;
    awaitingClient: number;
    pendingReminders: number;
  };
  overdueCases: Array<{
    id: number;
    caseNumber: string;
    clientName: string;
    caseType: string;
    dueDate: string;
    status: string;
  }>;
  awaitingClientCases: Array<{
    id: number;
    caseNumber: string;
    clientName: string;
    caseType: string;
    lastContactDate: string;
  }>;
  paymentWatchlist: Array<{
    id: number;
    caseNumber: string;
    clientName: string;
    totalAmount: number;
    outstandingAmount: number;
    paymentStatus: string;
    dueDate: string | null;
  }>;
  pendingReviewCount: number;
  pendingReviewBreakdown: {
    reminderDrafts: number;
    ocrLowConfidence: number;
    discrepancies: number;
    other: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div>
      <Header title="Dashboard" description="Overview of cases, reminders, and pending actions" />
      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {data && (
          <>
            <StatsCards stats={data.stats} />

            <div className="grid gap-6 lg:grid-cols-2">
              <OverdueTable cases={data.overdueCases} />
              <AwaitingClientList cases={data.awaitingClientCases} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PaymentWatchlist cases={data.paymentWatchlist} />
              </div>
              <div>
                <PendingReviewItems
                  count={data.pendingReviewCount}
                  breakdown={data.pendingReviewBreakdown}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
