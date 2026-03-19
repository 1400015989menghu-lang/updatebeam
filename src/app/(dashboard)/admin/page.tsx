"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const router = useRouter();

  const adminSections = [
    {
      title: "Users & Roles",
      description: "Manage user accounts, roles, and permissions",
      icon: "👥",
      path: "/admin/users",
      color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
      badge: null,
    },
    {
      title: "Reminder Templates",
      description: "Configure reminder templates for various case types",
      icon: "📧",
      path: "/admin/templates",
      color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
      badge: null,
    },
    {
      title: "Reminder Policies",
      description: "Set up reminder schedules and escalation rules",
      icon: "⏰",
      path: "/admin/policies",
      color: "bg-green-50 border-green-200 hover:bg-green-100",
      badge: "Coming Soon",
    },
    {
      title: "Retention Policies",
      description: "Configure data retention and archival rules",
      icon: "📦",
      path: "/admin/retention",
      color: "bg-amber-50 border-amber-200 hover:bg-amber-100",
      badge: "Coming Soon",
    },
    {
      title: "Integration Settings",
      description: "Manage API keys, webhooks, and external integrations",
      icon: "🔗",
      path: "/admin/integrations",
      color: "bg-teal-50 border-teal-200 hover:bg-teal-100",
      badge: "Coming Soon",
    },
    {
      title: "System Settings",
      description: "General system configuration and preferences",
      icon: "⚙️",
      path: "/admin/settings",
      color: "bg-rose-50 border-rose-200 hover:bg-rose-100",
      badge: "Coming Soon",
    },
  ];

  const handleCardClick = (path: string, badge: string | null) => {
    if (!badge) {
      router.push(path);
    }
  };

  return (
    <div>
      <Header
        title="Administration"
        description="System configuration, user management, and integrations"
      />

      <div className="p-6 space-y-6">
        {/* Admin Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminSections.map((section) => (
            <Card
              key={section.title}
              className={`${section.color} transition-all cursor-pointer ${
                section.badge ? "opacity-75" : "hover:shadow-md"
              }`}
              onClick={() => handleCardClick(section.path, section.badge)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-2xl">{section.icon}</span>
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {section.description}
                    </CardDescription>
                  </div>
                  {section.badge && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      {section.badge}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold">System Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">
                  Total Users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15</div>
                <p className="text-xs text-muted-foreground mt-1">
                  12 active, 3 inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">
                  Active Cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all departments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">
                  Documents Stored
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,247</div>
                <p className="text-xs text-muted-foreground mt-1">
                  12.4 GB total size
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">
                  Reminders Sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3,456</div>
                <p className="text-xs text-muted-foreground mt-1">
                  This month
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Admin Activity</h3>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-sm">
                  <div className="text-muted-foreground text-xs mt-0.5">
                    2h ago
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">John Doe</span> updated user
                    permissions for <span className="font-medium">Jane Smith</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="text-muted-foreground text-xs mt-0.5">
                    5h ago
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Admin</span> created new
                    reminder template for AR cases
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="text-muted-foreground text-xs mt-0.5">
                    1d ago
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">System</span> archived 15
                    completed cases from 2023
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="text-muted-foreground text-xs mt-0.5">
                    2d ago
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Mike Johnson</span> added new
                    user <span className="font-medium">Sarah Lee</span> to
                    Accounting department
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
