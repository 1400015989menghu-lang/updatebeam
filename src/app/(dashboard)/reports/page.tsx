"use client";

import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReportsPage() {
  const reports = [
    {
      title: "Case Status Summary",
      description: "Overview of cases by status across all departments",
      icon: "📊",
      stats: [
        { label: "Active Cases", value: "42", color: "text-blue-600" },
        { label: "Completed This Month", value: "18", color: "text-green-600" },
        { label: "Overdue", value: "5", color: "text-red-600" },
      ],
      color: "bg-blue-50 border-blue-200",
    },
    {
      title: "Reminder Performance",
      description: "Reminder delivery rates and client response metrics",
      icon: "📧",
      stats: [
        { label: "Sent This Month", value: "156", color: "text-purple-600" },
        { label: "Delivery Rate", value: "98%", color: "text-green-600" },
        { label: "Response Rate", value: "67%", color: "text-amber-600" },
      ],
      color: "bg-purple-50 border-purple-200",
    },
    {
      title: "Document Processing Stats",
      description: "OCR processing metrics and document turnaround times",
      icon: "📄",
      stats: [
        { label: "Processed Today", value: "23", color: "text-indigo-600" },
        { label: "Avg Confidence", value: "92%", color: "text-green-600" },
        { label: "Pending Review", value: "8", color: "text-amber-600" },
      ],
      color: "bg-indigo-50 border-indigo-200",
    },
    {
      title: "Payment Collection Status",
      description: "Outstanding payments and collection performance",
      icon: "💰",
      stats: [
        { label: "Outstanding Amount", value: "$45,200", color: "text-red-600" },
        { label: "Collected This Month", value: "$28,500", color: "text-green-600" },
        { label: "Overdue Accounts", value: "12", color: "text-amber-600" },
      ],
      color: "bg-green-50 border-green-200",
    },
    {
      title: "Team Performance",
      description: "Staff workload distribution and productivity metrics",
      icon: "👥",
      stats: [
        { label: "Active Staff", value: "15", color: "text-teal-600" },
        { label: "Avg Cases per Staff", value: "2.8", color: "text-blue-600" },
        { label: "Tasks Completed", value: "89", color: "text-green-600" },
      ],
      color: "bg-teal-50 border-teal-200",
    },
    {
      title: "Client Engagement",
      description: "Client communication metrics and satisfaction scores",
      icon: "🤝",
      stats: [
        { label: "Active Clients", value: "38", color: "text-rose-600" },
        { label: "New This Month", value: "4", color: "text-green-600" },
        { label: "Avg Response Time", value: "2.3h", color: "text-blue-600" },
      ],
      color: "bg-rose-50 border-rose-200",
    },
  ];

  return (
    <div>
      <Header
        title="Reports"
        description="Analytics and insights across cases, reminders, documents, and payments"
      />

      <div className="p-6 space-y-6">
        {/* Phase 2 Notice */}
        <div className="bg-muted/50 border border-dashed rounded-lg p-6 text-center space-y-2">
          <div className="text-4xl mb-2">📈</div>
          <h2 className="text-xl font-semibold">Reports & Analytics</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive reporting dashboard with real-time analytics, custom
            report generation, and data export capabilities.
          </p>
          <Badge variant="secondary" className="mt-4">
            Coming in Phase 2
          </Badge>
        </div>

        {/* Report Cards */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Key Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <Card
                key={report.title}
                className={`${report.color} transition-all hover:shadow-md cursor-pointer`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-2xl">{report.icon}</span>
                        {report.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {report.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-xs text-muted-foreground">
                          {stat.label}
                        </span>
                        <span
                          className={`text-sm font-semibold ${stat.color}`}
                        >
                          {stat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Planned Features */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Advanced Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Custom Report Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Drag-and-drop report builder interface</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Multiple visualization types (charts, tables, graphs)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Save and share custom report templates</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data Export</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Export to Excel, PDF, and CSV formats</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Scheduled report generation and email delivery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>API access for external integrations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filters & Drill-down</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Date range, department, and case type filters</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Interactive drill-down into detailed data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Comparison views (period-over-period)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dashboards</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Role-based dashboard views</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Real-time data updates and alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Customizable widgets and layouts</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
