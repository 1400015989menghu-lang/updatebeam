"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, FileText, Search, MessageSquare } from "lucide-react";
import Link from "next/link";

interface PendingReviewItemsProps {
  count: number;
  breakdown?: {
    reminderDrafts: number;
    ocrLowConfidence: number;
    discrepancies: number;
    other: number;
  };
}

export function PendingReviewItems({ count, breakdown }: PendingReviewItemsProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Pending Review Items</h2>
        <Link href="/review" className="text-sm text-blue-600 hover:text-blue-800">
          View all
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="bg-orange-50 p-4 rounded-lg">
          <AlertCircle className="h-8 w-8 text-orange-600" />
        </div>
        <div>
          <p className="text-3xl font-bold">{count}</p>
          <p className="text-sm text-gray-600">Items need review</p>
        </div>
      </div>

      {breakdown && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-600" />
              <span className="text-sm">Reminder Drafts</span>
            </div>
            <span className="text-sm font-semibold">{breakdown.reminderDrafts}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-600" />
              <span className="text-sm">OCR Low Confidence</span>
            </div>
            <span className="text-sm font-semibold">{breakdown.ocrLowConfidence}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              <span className="text-sm">Discrepancies</span>
            </div>
            <span className="text-sm font-semibold">{breakdown.discrepancies}</span>
          </div>
          {breakdown.other > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-sm">Other</span>
              </div>
              <span className="text-sm font-semibold">{breakdown.other}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
