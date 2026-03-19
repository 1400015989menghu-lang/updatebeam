"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DocumentTable } from "@/components/documents/document-table";
import { DocumentUpload } from "@/components/documents/document-upload";
import { DocumentDetail } from "@/components/documents/document-detail";
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

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sensitiveOnly, setSensitiveOnly] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [documents, categoryFilter, statusFilter, searchQuery, sensitiveOnly]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        // Show mock data if API not available
        setDocuments(getMockDocuments());
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
      // Show mock data on error
      setDocuments(getMockDocuments());
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...documents];

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((doc) => doc.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.fileName.toLowerCase().includes(query) ||
          doc.caseTitle?.toLowerCase().includes(query) ||
          doc.category.toLowerCase().includes(query)
      );
    }

    // Sensitive filter
    if (sensitiveOnly) {
      filtered = filtered.filter((doc) => doc.isSensitive);
    }

    setFilteredDocuments(filtered);
  };

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
    setDetailOpen(true);
  };

  const handleUploadComplete = () => {
    loadDocuments();
  };

  const handleDocumentUpdate = () => {
    loadDocuments();
  };

  const formatCategoryLabel = (category: string) => {
    return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div>
      <Header
        title="Documents"
        description="Manage uploaded documents, view OCR results, and track document processing"
        action={
          <Button onClick={() => setUploadOpen(true)}>Upload Document</Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filter Bar */}
        <div className="bg-card border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <Label htmlFor="category-filter" className="text-xs">
                Category
              </Label>
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value || "all")}
              >
                <SelectTrigger id="category-filter">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.keys(DOCUMENT_CATEGORY).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {formatCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="text-xs">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value || "all")}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.keys(DOCUMENT_STATUS).map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-xs">
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sensitive Only Toggle */}
            <div className="space-y-2">
              <Label htmlFor="sensitive-toggle" className="text-xs">
                Filters
              </Label>
              <div className="flex items-center space-x-2 h-10">
                <Switch
                  id="sensitive-toggle"
                  checked={sensitiveOnly}
                  onCheckedChange={setSensitiveOnly}
                />
                <Label
                  htmlFor="sensitive-toggle"
                  className="text-sm cursor-pointer"
                >
                  Sensitive only
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredDocuments.length} of {documents.length} documents
          </p>
          {(categoryFilter !== "all" ||
            statusFilter !== "all" ||
            searchQuery ||
            sensitiveOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryFilter("all");
                setStatusFilter("all");
                setSearchQuery("");
                setSensitiveOnly(false);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Document Table */}
        <DocumentTable
          documents={filteredDocuments}
          onDocumentClick={handleDocumentClick}
          isLoading={isLoading}
        />
      </div>

      {/* Upload Dialog */}
      <DocumentUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadComplete={handleUploadComplete}
      />

      {/* Detail Dialog */}
      <DocumentDetail
        document={selectedDocument}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={handleDocumentUpdate}
      />
    </div>
  );
}

// Mock data for development
function getMockDocuments(): Document[] {
  return [
    {
      id: "doc-001",
      fileName: "invoice-2024-001.pdf",
      fileType: "application/pdf",
      fileSize: 1024 * 500,
      caseId: "case-001",
      caseTitle: "ABC Corp Annual Return",
      category: "INVOICE",
      status: "OCR_PROCESSED",
      ocrStatus: "COMPLETED",
      confidence: 95,
      uploadedAt: new Date(2024, 2, 15).toISOString(),
      uploadedBy: "user-001",
      uploadedByName: "John Doe",
      isSensitive: false,
    },
    {
      id: "doc-002",
      fileName: "passport_copy.jpg",
      fileType: "image/jpeg",
      fileSize: 1024 * 1024 * 2,
      caseId: "case-002",
      caseTitle: "XYZ Ltd Incorporation",
      category: "PASSPORT",
      status: "REVIEWED",
      ocrStatus: "COMPLETED",
      confidence: 88,
      uploadedAt: new Date(2024, 2, 14).toISOString(),
      uploadedBy: "user-002",
      uploadedByName: "Jane Smith",
      isSensitive: true,
    },
    {
      id: "doc-003",
      fileName: "bank_statement_jan_2024.pdf",
      fileType: "application/pdf",
      fileSize: 1024 * 1024 * 1.5,
      caseId: "case-003",
      caseTitle: "DEF Inc Tax Filing",
      category: "BANK_STATEMENT",
      status: "CLASSIFIED",
      ocrStatus: "PROCESSING",
      confidence: null,
      uploadedAt: new Date(2024, 2, 13).toISOString(),
      uploadedBy: "user-001",
      uploadedByName: "John Doe",
      isSensitive: true,
    },
    {
      id: "doc-004",
      fileName: "ea_form_2023.pdf",
      fileType: "application/pdf",
      fileSize: 1024 * 300,
      caseId: "case-001",
      caseTitle: "ABC Corp Annual Return",
      category: "EA_FORM",
      status: "OCR_PROCESSED",
      ocrStatus: "COMPLETED",
      confidence: 72,
      uploadedAt: new Date(2024, 2, 12).toISOString(),
      uploadedBy: "user-003",
      uploadedByName: "Mike Johnson",
      isSensitive: false,
    },
    {
      id: "doc-005",
      fileName: "resolution_board_meeting.pdf",
      fileType: "application/pdf",
      fileSize: 1024 * 450,
      caseId: null,
      category: "RESOLUTION",
      status: "RECEIVED",
      ocrStatus: null,
      confidence: null,
      uploadedAt: new Date(2024, 2, 11).toISOString(),
      uploadedBy: "user-002",
      uploadedByName: "Jane Smith",
      isSensitive: false,
    },
  ];
}
