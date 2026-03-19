"use client";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { CaseDetailTabs } from "@/components/cases/case-detail-tabs";
import { CaseDetailSidebar } from "@/components/cases/case-detail-sidebar";
import { ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface CaseDetail {
  id: number;
  caseNumber: string;
  clientName: string;
  clientCompany: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  status: string;
  department: string;
  caseType: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  ownerName: string | null;
  paymentStatus: string;
  totalAmount: number;
  outstandingAmount: number;
  paymentDueDate: string | null;
  signedReceived: boolean;
  originalReceived: boolean;
  statusHistory: Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    notes: string | null;
  }>;
}

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCaseData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cases/${caseId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Case not found");
        }
        throw new Error("Failed to fetch case details");
      }

      const result = await response.json();
      setCaseData(result.case);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseData();
  }, [caseId]);

  if (loading) {
    return (
      <div>
        <Header title="Loading..." description="Please wait" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div>
        <Header title="Error" description="Failed to load case" />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading case</p>
            <p className="text-sm">{error || "Case not found"}</p>
          </div>
          <Button onClick={() => router.push("/cases")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/cases")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <span>{caseData.caseNumber}</span>
                <CaseStatusBadge status={caseData.status} />
              </div>
              <p className="text-sm font-normal text-gray-600 mt-1">
                {caseData.title}
              </p>
            </div>
          </div>
        }
        description={`Client: ${caseData.clientName}${caseData.clientCompany ? ` (${caseData.clientCompany})` : ""}`}
      />
      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <CaseDetailTabs caseId={parseInt(caseId)} caseData={caseData} onUpdate={fetchCaseData} />
          </div>
          <div className="lg:col-span-1">
            <CaseDetailSidebar
              caseId={parseInt(caseId)}
              currentStatus={caseData.status}
              paymentStatus={caseData.paymentStatus}
              signedReceived={caseData.signedReceived}
              originalReceived={caseData.originalReceived}
              onUpdate={fetchCaseData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
