"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DOCUMENT_CATEGORY, DOCUMENT_STATUS } from "@/lib/constants";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  caseId: string | null;
  caseTitle?: string;
  category: keyof typeof DOCUMENT_CATEGORY;
  status: keyof typeof DOCUMENT_STATUS;
  ocrStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
  confidence: number | null;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
  isSensitive: boolean;
}

interface DocumentTableProps {
  documents: Document[];
  onDocumentClick: (document: Document) => void;
  isLoading?: boolean;
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    INVOICE: "bg-blue-100 text-blue-800 border-blue-200",
    PAYMENT_VOUCHER: "bg-green-100 text-green-800 border-green-200",
    OFFICIAL_RECEIPT: "bg-purple-100 text-purple-800 border-purple-200",
    SUPPLIER_INVOICE: "bg-cyan-100 text-cyan-800 border-cyan-200",
    BANK_STATEMENT: "bg-indigo-100 text-indigo-800 border-indigo-200",
    IC_CARD: "bg-pink-100 text-pink-800 border-pink-200",
    PASSPORT: "bg-rose-100 text-rose-800 border-rose-200",
    TAX_FORM: "bg-amber-100 text-amber-800 border-amber-200",
    RESOLUTION: "bg-teal-100 text-teal-800 border-teal-200",
    ENGAGEMENT_LETTER: "bg-violet-100 text-violet-800 border-violet-200",
    AUDITED_REPORT: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    EA_FORM: "bg-lime-100 text-lime-800 border-lime-200",
    FORM_E: "bg-emerald-100 text-emerald-800 border-emerald-200",
    OTHER: "bg-gray-100 text-gray-800 border-gray-200",
  };
  return colors[category] || colors.OTHER;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    REQUESTED: "bg-yellow-100 text-yellow-800 border-yellow-200",
    RECEIVED: "bg-blue-100 text-blue-800 border-blue-200",
    CLASSIFIED: "bg-indigo-100 text-indigo-800 border-indigo-200",
    OCR_PROCESSED: "bg-purple-100 text-purple-800 border-purple-200",
    REVIEWED: "bg-green-100 text-green-800 border-green-200",
    SIGNED_RECEIVED: "bg-teal-100 text-teal-800 border-teal-200",
    ORIGINAL_RECEIVED: "bg-cyan-100 text-cyan-800 border-cyan-200",
    ARCHIVED: "bg-gray-100 text-gray-800 border-gray-200",
    DELETED: "bg-red-100 text-red-800 border-red-200",
  };
  return colors[status] || colors.RECEIVED;
};

const formatCategoryLabel = (category: string) => {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatStatusLabel = (status: string) => {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export function DocumentTable({
  documents,
  onDocumentClick,
  isLoading,
}: DocumentTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">No documents found</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            <TableHead>Case</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>OCR Status</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead>Sensitive</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow
              key={doc.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onDocumentClick(doc)}
            >
              <TableCell className="font-medium">{doc.fileName}</TableCell>
              <TableCell>
                {doc.caseTitle || (doc.caseId ? `Case #${doc.caseId}` : "-")}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={getCategoryColor(doc.category)}
                >
                  {formatCategoryLabel(doc.category)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getStatusColor(doc.status)}>
                  {formatStatusLabel(doc.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {doc.ocrStatus ? (
                  <Badge
                    variant={
                      doc.ocrStatus === "COMPLETED"
                        ? "secondary"
                        : doc.ocrStatus === "FAILED"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {doc.ocrStatus}
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-right">
                {doc.confidence != null ? `${doc.confidence}%` : "-"}
              </TableCell>
              <TableCell>
                {new Date(doc.uploadedAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {doc.isSensitive && (
                  <Badge variant="destructive" className="text-xs">
                    Sensitive
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
