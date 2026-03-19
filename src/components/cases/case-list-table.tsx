"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CaseStatusBadge, PriorityBadge } from "@/components/cases/case-status-badge";
import { formatDate, formatCurrency } from "@/lib/utils/case-utils";
import { useRouter } from "next/navigation";
import { DEPARTMENT_LABELS } from "@/lib/constants";

interface Case {
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
}

interface CaseListTableProps {
  cases: Case[];
}

export function CaseListTable({ cases }: CaseListTableProps) {
  const router = useRouter();

  if (cases.length === 0) {
    return (
      <div className="text-center py-12 bg-white border rounded-lg">
        <p className="text-gray-500">No cases found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => (
            <TableRow
              key={caseItem.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => router.push(`/cases/${caseItem.id}`)}
            >
              <TableCell className="font-medium text-blue-600">{caseItem.caseNumber}</TableCell>
              <TableCell>{caseItem.clientName}</TableCell>
              <TableCell>{caseItem.caseType}</TableCell>
              <TableCell>{DEPARTMENT_LABELS[caseItem.department]}</TableCell>
              <TableCell>
                <CaseStatusBadge status={caseItem.status} />
              </TableCell>
              <TableCell>
                <PriorityBadge priority={caseItem.priority} />
              </TableCell>
              <TableCell>{formatDate(caseItem.dueDate)}</TableCell>
              <TableCell>{caseItem.ownerName}</TableCell>
              <TableCell className="text-right">
                {caseItem.outstandingAmount > 0 ? (
                  <span className="font-semibold text-red-600">{formatCurrency(caseItem.outstandingAmount)}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
