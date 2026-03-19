"use client";

import { useEffect, useState } from "react";
import { ReviewQueueTable } from "@/components/review/review-queue-table";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ReviewItem {
  id: string;
  type: "REMINDER_DRAFT" | "OCR_LOW_CONFIDENCE" | "INCORPORATION_DRAFT" | "DISCREPANCY_FINDING" | "REGULATORY_DIGEST" | "MBRS_MISMATCH";
  title: string;
  caseLink?: string;
  caseName?: string;
  confidence?: number;
  status: "NEW" | "IN_REVIEW" | "APPROVED" | "EDITED_AND_APPROVED" | "REJECTED" | "NEEDS_MORE_INFO";
  createdAt: string;
  aiOutput?: string;
  sourceDocuments?: Array<{ id: string; name: string; url?: string }>;
  metadata?: Record<string, unknown>;
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviewItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/review");
      if (!response.ok) {
        throw new Error("Failed to fetch review items");
      }
      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Failed to fetch review items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewItems();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground">
            Review AI-generated content and take action on items requiring attention
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReviewItems}
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

      {/* Table */}
      <ReviewQueueTable items={items} loading={loading} onRefresh={fetchReviewItems} />
    </div>
  );
}
