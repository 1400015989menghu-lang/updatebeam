"use client";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { formatDate } from "@/lib/utils/case-utils";
import Link from "next/link";

interface OverdueCase {
  id: number;
  caseNumber: string;
  clientName: string;
  caseType: string;
  dueDate: string;
  status: string;
}

interface OverdueTableProps {
  cases: OverdueCase[];
}

export function OverdueTable({ cases }: OverdueTableProps) {
  if (cases.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Overdue Cases</h2>
        <p className="text-sm text-gray-500">No overdue cases</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Overdue Cases</h2>
        <Link href="/cases?filter=overdue" className="text-sm text-blue-600 hover:text-blue-800">
          View all
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => (
            <TableRow key={caseItem.id} className="cursor-pointer hover:bg-gray-50">
              <TableCell>
                <Link href={`/cases/${caseItem.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                  {caseItem.caseNumber}
                </Link>
              </TableCell>
              <TableCell>{caseItem.clientName}</TableCell>
              <TableCell>{caseItem.caseType}</TableCell>
              <TableCell className="text-red-600 font-medium">{formatDate(caseItem.dueDate)}</TableCell>
              <TableCell>
                <CaseStatusBadge status={caseItem.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
