"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "./tabs/overview-tab";
import { DocumentsTab } from "./tabs/documents-tab";
import { RemindersTab } from "./tabs/reminders-tab";
import { TasksTab } from "./tabs/tasks-tab";
import { NotesTab } from "./tabs/notes-tab";
import { AuditLogTab } from "./tabs/audit-log-tab";

interface CaseDetailTabsProps {
  caseId: number;
  caseData: any;
  onUpdate?: () => void;
}

export function CaseDetailTabs({ caseId, caseData, onUpdate }: CaseDetailTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
        <TabsTrigger value="reminders">Reminders</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="audit">Audit Log</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <OverviewTab caseData={caseData} />
      </TabsContent>

      <TabsContent value="documents" className="mt-6">
        <DocumentsTab caseId={caseId} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="reminders" className="mt-6">
        <RemindersTab caseId={caseId} />
      </TabsContent>

      <TabsContent value="tasks" className="mt-6">
        <TasksTab caseId={caseId} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value="notes" className="mt-6">
        <NotesTab caseId={caseId} />
      </TabsContent>

      <TabsContent value="audit" className="mt-6">
        <AuditLogTab caseId={caseId} />
      </TabsContent>
    </Tabs>
  );
}
