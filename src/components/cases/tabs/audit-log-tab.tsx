"use client";

import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/case-utils";
import { Activity } from "lucide-react";
import { useEffect, useState } from "react";

interface AuditLogEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  changes: string | null;
  performedBy: string;
  performedAt: string;
}

interface AuditLogTabProps {
  caseId: number;
}

export function AuditLogTab({ caseId }: AuditLogTabProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditLog() {
      try {
        const response = await fetch(`/api/cases/${caseId}/audit-log`);
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Failed to fetch audit log:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAuditLog();
  }, [caseId]);

  const getActionColor = (action: string) => {
    if (action.includes("CREATE")) return "text-green-600 bg-green-50";
    if (action.includes("UPDATE")) return "text-blue-600 bg-blue-50";
    if (action.includes("DELETE")) return "text-red-600 bg-red-50";
    return "text-gray-600 bg-gray-50";
  };

  const formatChanges = (changes: string | null) => {
    if (!changes) return null;
    try {
      const parsed = JSON.parse(changes);
      return (
        <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
          {Object.entries(parsed).map(([key, value]: [string, any]) => (
            <div key={key}>
              <span className="font-medium">{key}:</span>{" "}
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </div>
          ))}
        </div>
      );
    } catch {
      return <div className="mt-2 text-xs text-gray-600">{changes}</div>;
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No activity yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log, index) => (
            <div key={log.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${index === 0 ? "bg-blue-600" : "bg-gray-300"}`}></div>
                {index < logs.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>}
              </div>
              <Card className="flex-1 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    {log.entityType && (
                      <span className="ml-2 text-sm text-gray-600">
                        {log.entityType}
                        {log.entityId && ` #${log.entityId}`}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{formatDateTime(log.performedAt)}</span>
                </div>
                <p className="text-sm text-gray-700">by {log.performedBy}</p>
                {formatChanges(log.changes)}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
