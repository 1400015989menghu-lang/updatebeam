"use client";

import { Card } from "@/components/ui/card";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { formatDate } from "@/lib/utils/case-utils";
import Link from "next/link";
import { Clock } from "lucide-react";

interface AwaitingCase {
  id: number;
  caseNumber: string;
  clientName: string;
  caseType: string;
  lastContactDate: string;
}

interface AwaitingClientListProps {
  cases: AwaitingCase[];
}

export function AwaitingClientList({ cases }: AwaitingClientListProps) {
  if (cases.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Awaiting Client Response</h2>
        <p className="text-sm text-gray-500">No cases awaiting client response</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Awaiting Client Response</h2>
        <Link href="/cases?status=AWAITING_CLIENT" className="text-sm text-blue-600 hover:text-blue-800">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {cases.map((caseItem) => (
          <Link
            key={caseItem.id}
            href={`/cases/${caseItem.id}`}
            className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-blue-600">{caseItem.caseNumber}</span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-900">{caseItem.clientName}</span>
                </div>
                <p className="text-sm text-gray-600">{caseItem.caseType}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>Last contact: {formatDate(caseItem.lastContactDate)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
