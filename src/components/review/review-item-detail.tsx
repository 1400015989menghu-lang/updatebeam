"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfidenceBadge } from "./confidence-badge";
import { REVIEW_ITEM_TYPE, REVIEW_ITEM_STATUS } from "@/lib/constants";
import { AlertCircle, FileText, Link as LinkIcon, CheckCircle, XCircle, Info } from "lucide-react";

interface ReviewItemDetailProps {
  item: {
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
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: "APPROVE" | "EDIT_AND_APPROVE" | "REJECT" | "REQUEST_MORE_INFO", data?: { content?: string; reason?: string }) => Promise<void>;
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

export function ReviewItemDetail({ item, open, onOpenChange, onAction }: ReviewItemDetailProps) {
  const [mode, setMode] = useState<"view" | "edit" | "reject">("view");
  const [editedContent, setEditedContent] = useState(item.aiOutput || "");
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: "APPROVE" | "EDIT_AND_APPROVE" | "REJECT" | "REQUEST_MORE_INFO") => {
    setLoading(true);
    try {
      if (action === "EDIT_AND_APPROVE") {
        await onAction(action, { content: editedContent });
      } else if (action === "REJECT") {
        await onAction(action, { reason: rejectReason });
      } else {
        await onAction(action);
      }
      setMode("view");
      setRejectReason("");
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {TYPE_ICONS[item.type]}
              {TYPE_LABELS[item.type]}
            </Badge>
            <span>{item.title}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-6 pr-4">
            {/* Case Link */}
            {item.caseLink && (
              <div>
                <Label className="text-xs text-muted-foreground">Associated Case</Label>
                <div className="flex items-center gap-2 mt-1">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <a href={item.caseLink} className="text-sm text-blue-600 hover:underline">
                    {item.caseName || item.caseLink}
                  </a>
                </div>
              </div>
            )}

            {/* Confidence Score */}
            {item.confidence !== undefined && (
              <div>
                <Label className="text-xs text-muted-foreground">Confidence Score</Label>
                <div className="mt-2">
                  <ConfidenceBadge confidence={item.confidence} />
                </div>
              </div>
            )}

            {/* Source Documents */}
            {item.sourceDocuments && item.sourceDocuments.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Source Documents</Label>
                <div className="mt-2 space-y-2">
                  {item.sourceDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {doc.url ? (
                        <a href={doc.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                          {doc.name}
                        </a>
                      ) : (
                        <span>{doc.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* AI Output / Content */}
            <div>
              <Label className="text-xs text-muted-foreground">
                {mode === "edit" ? "Edit AI Output" : "AI Output"}
              </Label>
              {mode === "edit" ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="mt-2 min-h-[300px] font-mono text-sm"
                  placeholder="Edit the AI-generated content..."
                />
              ) : mode === "reject" ? (
                <div className="mt-2">
                  <Label htmlFor="reject-reason" className="text-sm">Rejection Reason</Label>
                  <Textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="mt-2 min-h-[150px]"
                    placeholder="Please provide a reason for rejection..."
                  />
                </div>
              ) : (
                <div className="mt-2 p-4 bg-muted rounded-md">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{item.aiOutput || "No content available"}</pre>
                </div>
              )}
            </div>

            {/* Metadata */}
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Additional Information</Label>
                <div className="mt-2 p-4 bg-muted rounded-md">
                  <pre className="text-xs">{JSON.stringify(item.metadata, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          {mode === "view" && (
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setMode("reject")}
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction("REQUEST_MORE_INFO")}
                disabled={loading}
              >
                <Info className="h-4 w-4 mr-2" />
                Request More Info
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditedContent(item.aiOutput || "");
                  setMode("edit");
                }}
                disabled={loading}
              >
                Edit & Approve
              </Button>
              <Button
                onClick={() => handleAction("APPROVE")}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          )}

          {mode === "edit" && (
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setMode("view")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAction("EDIT_AND_APPROVE")}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Save & Approve
              </Button>
            </div>
          )}

          {mode === "reject" && (
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setMode("view")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction("REJECT")}
                disabled={loading || !rejectReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Confirm Rejection
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
