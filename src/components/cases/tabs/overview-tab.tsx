"use client";

import { Card } from "@/components/ui/card";
import { CaseStatusBadge, PriorityBadge, PaymentStatusBadge } from "@/components/cases/case-status-badge";
import { formatDate, formatCurrency } from "@/lib/utils/case-utils";
import { DEPARTMENT_LABELS, CASE_STATUS_LABELS } from "@/lib/constants";
import { User, Calendar, FileText, DollarSign, CheckCircle2, FileCheck } from "lucide-react";

interface OverviewTabProps {
  caseData: any;
}

export function OverviewTab({ caseData }: OverviewTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-gray-600" />
          Client Information
        </h3>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-gray-600">Client Name</dt>
            <dd className="text-base font-medium">{caseData.clientName}</dd>
          </div>
          {caseData.clientCompany && (
            <div>
              <dt className="text-sm text-gray-600">Company</dt>
              <dd className="text-base font-medium">{caseData.clientCompany}</dd>
            </div>
          )}
          {caseData.clientEmail && (
            <div>
              <dt className="text-sm text-gray-600">Email</dt>
              <dd className="text-base">{caseData.clientEmail}</dd>
            </div>
          )}
          {caseData.clientPhone && (
            <div>
              <dt className="text-sm text-gray-600">Phone</dt>
              <dd className="text-base">{caseData.clientPhone}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          Case Dates
        </h3>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-gray-600">Created Date</dt>
            <dd className="text-base font-medium">{formatDate(caseData.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Due Date</dt>
            <dd className="text-base font-medium">{formatDate(caseData.dueDate)}</dd>
          </div>
          {caseData.completedAt && (
            <div>
              <dt className="text-sm text-gray-600">Completed Date</dt>
              <dd className="text-base font-medium">{formatDate(caseData.completedAt)}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-gray-600">Last Updated</dt>
            <dd className="text-base">{formatDate(caseData.updatedAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-600" />
          Case Details
        </h3>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-gray-600">Department</dt>
            <dd className="text-base font-medium">{DEPARTMENT_LABELS[caseData.department]}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Case Type</dt>
            <dd className="text-base font-medium">{caseData.caseType}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Priority</dt>
            <dd className="mt-1">
              <PriorityBadge priority={caseData.priority} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Owner</dt>
            <dd className="text-base font-medium">{caseData.ownerName || "Unassigned"}</dd>
          </div>
          {caseData.description && (
            <div>
              <dt className="text-sm text-gray-600">Description</dt>
              <dd className="text-base mt-1">{caseData.description}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-gray-600" />
          Payment Information
        </h3>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-gray-600">Payment Status</dt>
            <dd className="mt-1">
              <PaymentStatusBadge status={caseData.paymentStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Total Amount</dt>
            <dd className="text-base font-medium">{formatCurrency(caseData.totalAmount)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Outstanding Amount</dt>
            <dd className={`text-base font-semibold ${caseData.outstandingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(caseData.outstandingAmount)}
            </dd>
          </div>
          {caseData.paymentDueDate && (
            <div>
              <dt className="text-sm text-gray-600">Payment Due Date</dt>
              <dd className="text-base font-medium">{formatDate(caseData.paymentDueDate)}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-gray-600" />
          Document Tracking
        </h3>
        <dl className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-5 w-5 ${caseData.signedReceived ? "text-green-600" : "text-gray-400"}`} />
              <span className="text-sm font-medium">Signed Documents</span>
            </div>
            <span className={`text-sm font-semibold ${caseData.signedReceived ? "text-green-600" : "text-gray-600"}`}>
              {caseData.signedReceived ? "Received" : "Not Received"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-5 w-5 ${caseData.originalReceived ? "text-green-600" : "text-gray-400"}`} />
              <span className="text-sm font-medium">Original Documents</span>
            </div>
            <span className={`text-sm font-semibold ${caseData.originalReceived ? "text-green-600" : "text-gray-600"}`}>
              {caseData.originalReceived ? "Received" : "Not Received"}
            </span>
          </div>
        </dl>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Status Timeline</h3>
        <div className="space-y-4">
          {caseData.statusHistory && caseData.statusHistory.length > 0 ? (
            caseData.statusHistory.map((entry: any, index: number) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${index === 0 ? "bg-blue-600" : "bg-gray-300"}`}></div>
                  {index < caseData.statusHistory.length - 1 && <div className="w-0.5 h-full bg-gray-200"></div>}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CaseStatusBadge status={entry.status} />
                    <span className="text-xs text-gray-500">{formatDate(entry.changedAt)}</span>
                  </div>
                  {entry.changedBy && <p className="text-sm text-gray-600">by {entry.changedBy}</p>}
                  {entry.notes && <p className="text-sm text-gray-700 mt-1">{entry.notes}</p>}
                </div>
              </div>
            ))
          ) : (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CaseStatusBadge status={caseData.status} />
                  <span className="text-xs text-gray-500">{formatDate(caseData.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-600">Case created</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
