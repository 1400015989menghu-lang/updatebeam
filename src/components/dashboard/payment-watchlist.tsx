"use client";

import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/cases/case-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils/case-utils";
import Link from "next/link";

interface PaymentCase {
  id: number;
  caseNumber: string;
  clientName: string;
  totalAmount: number;
  outstandingAmount: number;
  paymentStatus: string;
  dueDate: string | null;
}

interface PaymentWatchlistProps {
  cases: PaymentCase[];
}

export function PaymentWatchlist({ cases }: PaymentWatchlistProps) {
  if (cases.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Payment Watchlist</h2>
        <p className="text-sm text-gray-500">No outstanding payments</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Payment Watchlist</h2>
        <Link href="/cases?payment=outstanding" className="text-sm text-blue-600 hover:text-blue-800">
          View all
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
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
              <TableCell className="text-right">{formatCurrency(caseItem.totalAmount)}</TableCell>
              <TableCell className="text-right font-semibold text-red-600">
                {formatCurrency(caseItem.outstandingAmount)}
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={caseItem.paymentStatus} />
              </TableCell>
              <TableCell>{formatDate(caseItem.dueDate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
