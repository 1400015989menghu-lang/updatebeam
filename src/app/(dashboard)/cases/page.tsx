"use client";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { CaseFilters } from "@/components/cases/case-filters";
import { CaseListTable } from "@/components/cases/case-list-table";
import { Pagination } from "@/components/cases/pagination";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface CaseListResponse {
  cases: Array<{
    id: number;
    caseNumber: string;
    clientName: string;
    caseType: string;
    department: string;
    status: string;
    priority: string;
    dueDate: string | null;
    ownerName: string;
    outstandingAmount: number;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export default function CasesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    department: searchParams.get("department") || "ALL",
    status: searchParams.get("status") || "ALL",
    priority: searchParams.get("priority") || "ALL",
    search: searchParams.get("search") || "",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<CaseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCases() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: currentPage.toString(),
          ...(filters.department !== "ALL" && { department: filters.department }),
          ...(filters.status !== "ALL" && { status: filters.status }),
          ...(filters.priority !== "ALL" && { priority: filters.priority }),
          ...(filters.search && { search: filters.search }),
        });

        const response = await fetch(`/api/cases?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch cases");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, [filters, currentPage]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to page 1 when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      <Header
        title="Cases"
        description="Manage all cases across departments"
        action={
          <Button onClick={() => router.push("/cases/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        }
      />
      <div className="p-6">
        <CaseFilters filters={filters} onFilterChange={handleFilterChange} />

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading cases</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {data && (
          <>
            <CaseListTable cases={data.cases} />
            {data.pagination.totalPages > 1 && (
              <Pagination
                currentPage={data.pagination.currentPage}
                totalPages={data.pagination.totalPages}
                totalItems={data.pagination.totalItems}
                itemsPerPage={data.pagination.itemsPerPage}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
