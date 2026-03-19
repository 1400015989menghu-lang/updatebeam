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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge } from "./confidence-badge";
import { ReviewItemDetail } from "./review-item-detail";
import { REVIEW_ITEM_TYPE, REVIEW_ITEM_STATUS } from "@/lib/constants";
import { AlertCircle, FileText, Loader2 } from "lucide-react";

interface ReviewItem {
  id: string;
  type: keyof typeof REVIEW_ITEM_TYPE;
  title: string;
  caseLink?: string;
  caseName?: string;
  confidence?: number;
  status: keyof typeof REVIEW_ITEM_STATUS;
  createdAt: string;
  aiOutput?: string;
  sourceDocuments?: Array<{ id: string; name: string; url?: string }>;
  metadata?: Record<string, unknown>;
}

interface ReviewQueueTableProps {
  items: ReviewItem[];
  loading?: boolean;
  onRefresh?: () => void;
}

const TYPE_ICONS: Record<keyof typeof REVIEW_ITEM_TYPE, React.ReactNode> = {
  REMINDER_DRAFT: <AlertCircle className="h-4 w-4" />,
  OCR_LOW_CONFIDENCE: <FileText className="h-4 w-4" />,
  INCORPORATION_DRAFT: <FileText className="h-4 w-4" />,
  DISCREPANCY_FINDING: <AlertCircle className="h-4 w-4" />,
  REGULATORY_DIGEST: <FileText className="h-4 w-4" />,
  MBRS_MISMATCH: <AlertCircle className="h-4 w-4" />,
};

const TYPE_LABELS: Record<keyof typeof REVIEW_ITEM_TYPE, string> = {
  REMINDER_DRAFT: "Reminder Draft",
  OCR_LOW_CONFIDENCE: "OCR Low Confidence",
  INCORPORATION_DRAFT: "Incorporation Draft",
  DISCREPANCY_FINDING: "Discrepancy Finding",
  REGULATORY_DIGEST: "Regulatory Digest",
  MBRS_MISMATCH: "MBRS Mismatch",
};

const TYPE_COLORS: Record<keyof typeof REVIEW_ITEM_TYPE, string> = {
  REMINDER_DRAFT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  OCR_LOW_CONFIDENCE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  INCORPORATION_DRAFT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  DISCREPANCY_FINDING: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  REGULATORY_DIGEST: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  MBRS_MISMATCH: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const STATUS_COLORS: Record<keyof typeof REVIEW_ITEM_STATUS, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  IN_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  EDITED_AND_APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  NEEDS_MORE_INFO: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const STATUS_LABELS: Record<keyof typeof REVIEW_ITEM_STATUS, string> = {
  NEW: "New",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  EDITED_AND_APPROVED: "Edited & Approved",
  REJECTED: "Rejected",
  NEEDS_MORE_INFO: "Needs More Info",
};

export function ReviewQueueTable({ items, loading, onRefresh }: ReviewQueueTableProps) {
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredItems = items.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  const handleAction = async (
    itemId: string,
    action: "APPROVE" | "EDIT_AND_APPROVE" | "REJECT" | "REQUEST_MORE_INFO",
    data?: { content?: string; reason?: string }
  ) => {
    try {
      const response = await fetch(`/api/review/${itemId}`, {
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
        throw new Error("Failed to update review item");
      }

      setSelectedItem(null);
      onRefresh?.();
    } catch (error) {
      console.error("Failed to update review item:", error);
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.keys(REVIEW_ITEM_TYPE).map((type) => (
                <SelectItem key={type} value={type}>
                  {TYPE_LABELS[type as keyof typeof REVIEW_ITEM_TYPE]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.keys(REVIEW_ITEM_STATUS).map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status as keyof typeof REVIEW_ITEM_STATUS]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Case</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No review items found
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Badge variant="outline" className={TYPE_COLORS[item.type]}>
                      <span className="flex items-center gap-1">
                        {TYPE_ICONS[item.type]}
                        {TYPE_LABELS[item.type]}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    {item.caseLink ? (
                      <a href={item.caseLink} className="text-blue-600 hover:underline text-sm" onClick={(e) => e.stopPropagation()}>
                        {item.caseName || "View Case"}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.confidence !== undefined ? (
                      <ConfidenceBadge confidence={item.confidence} />
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[item.status]}>
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedItem(item)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      {selectedItem && (
        <ReviewItemDetail
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          onAction={(action, data) => handleAction(selectedItem.id, action, data)}
        />
      )}
    </div>
  );
}
