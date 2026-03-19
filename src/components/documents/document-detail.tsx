"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExtractedFields } from "./extracted-fields";
import { DOCUMENT_STATUS } from "@/lib/constants";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  caseId: string | null;
  caseTitle?: string;
  category: string;
  status: keyof typeof DOCUMENT_STATUS;
  ocrStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
  confidence: number | null;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
  isSensitive: boolean;
}

interface ExtractedField {
  id: string;
  fieldName: string;
  value: string;
  confidence: number;
  isConfirmed: boolean;
}

interface DocumentVersion {
  id: string;
  version: number;
  uploadedAt: string;
  uploadedBy: string;
  notes: string;
}

interface DocumentDetailProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function DocumentDetail({
  document,
  open,
  onOpenChange,
  onUpdate,
}: DocumentDetailProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  useEffect(() => {
    if (document && open) {
      setSelectedStatus(document.status);
      loadExtractedFields();
      loadVersionHistory();
    }
  }, [document, open]);

  const loadExtractedFields = async () => {
    if (!document) return;

    try {
      const response = await fetch(`/api/documents/${document.id}/fields`);
      if (response.ok) {
        const data = await response.json();
        setExtractedFields(data.fields || []);
      }
    } catch (error) {
      console.error("Failed to load extracted fields:", error);
    }
  };

  const loadVersionHistory = async () => {
    if (!document) return;

    try {
      const response = await fetch(`/api/documents/${document.id}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error("Failed to load version history:", error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!document) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setSelectedStatus(newStatus);
        onUpdate();
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update document status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldConfirm = async (fieldId: string, confirmed: boolean) => {
    if (!document) return;

    try {
      await fetch(`/api/documents/${document.id}/fields/${fieldId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isConfirmed: confirmed }),
      });
    } catch (error) {
      console.error("Failed to update field confirmation:", error);
    }
  };

  const handleAction = async (action: string) => {
    if (!document) return;

    if (action === "delete") {
      if (!confirm("Are you sure you want to delete this document?")) {
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${document.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        onUpdate();
        if (action === "delete" || action === "archive") {
          onOpenChange(false);
        }
      } else {
        throw new Error(`Failed to ${action} document`);
      }
    } catch (error) {
      console.error(`Failed to ${action} document:`, error);
      alert(`Failed to ${action} document`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatCategoryLabel = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="truncate">{document.fileName}</span>
            {document.isSensitive && (
              <Badge variant="destructive" className="text-xs">
                Sensitive
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Document details, extracted data, and version history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">File Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">File Type:</span>
                <span className="ml-2 font-medium">{document.fileType}</span>
              </div>
              <div>
                <span className="text-muted-foreground">File Size:</span>
                <span className="ml-2 font-medium">
                  {formatFileSize(document.fileSize)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Uploaded By:</span>
                <span className="ml-2 font-medium">
                  {document.uploadedByName || document.uploadedBy}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Upload Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(document.uploadedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Case:</span>
                <span className="ml-2 font-medium">
                  {document.caseTitle ||
                    (document.caseId ? `Case #${document.caseId}` : "N/A")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>
                <span className="ml-2 font-medium">
                  {formatCategoryLabel(document.category)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status Management */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Document Status</h3>
            <div className="flex items-center gap-4">
              <Select
                value={selectedStatus}
                onValueChange={(value) => handleStatusChange(value || "")}
                disabled={isLoading}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(DOCUMENT_STATUS).map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {document.ocrStatus && (
                <div>
                  <span className="text-sm text-muted-foreground mr-2">
                    OCR Status:
                  </span>
                  <Badge
                    variant={
                      document.ocrStatus === "COMPLETED"
                        ? "secondary"
                        : document.ocrStatus === "FAILED"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {document.ocrStatus}
                  </Badge>
                </div>
              )}
              {document.confidence != null && (
                <div className="text-sm">
                  <span className="text-muted-foreground mr-2">
                    Confidence:
                  </span>
                  <span className="font-medium">{document.confidence}%</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Tabs for Extracted Fields and Version History */}
          <Tabs defaultValue="fields" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fields">
                Extracted Fields ({extractedFields.length})
              </TabsTrigger>
              <TabsTrigger value="versions">
                Version History ({versions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fields" className="space-y-4 mt-4">
              <ExtractedFields
                documentId={document.id}
                fields={extractedFields}
                onFieldConfirm={handleFieldConfirm}
              />
            </TabsContent>

            <TabsContent value="versions" className="space-y-4 mt-4">
              {versions.length > 0 ? (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          Version {version.version}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(version.uploadedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Uploaded by {version.uploadedBy}
                      </div>
                      {version.notes && (
                        <div className="text-sm">{version.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No version history available
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleAction("reclassify")}
                disabled={isLoading}
              >
                Reclassify
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction("review")}
                disabled={isLoading}
              >
                Mark as Reviewed
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleAction("archive")}
                disabled={isLoading}
              >
                Archive
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleAction("delete")}
                disabled={isLoading}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
