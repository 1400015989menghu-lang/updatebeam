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

export default function KnowledgeCenterPage() {
  const knowledgeCategories = [
    {
      title: "FAQ Articles",
      description:
        "Frequently asked questions and answers for common client inquiries",
      icon: "❓",
      count: "Coming Soon",
      color: "bg-blue-50 border-blue-200",
    },
    {
      title: "Troubleshooting Flows",
      description:
        "Step-by-step guides for resolving common issues and technical problems",
      icon: "🔧",
      count: "Coming Soon",
      color: "bg-green-50 border-green-200",
    },
    {
      title: "Regulatory Updates",
      description:
        "Latest compliance updates, regulatory changes, and legal requirements",
      icon: "📋",
      count: "Coming Soon",
      color: "bg-purple-50 border-purple-200",
    },
    {
      title: "Client Impact Drafts",
      description:
        "Templates and drafts for communicating regulatory changes to clients",
      icon: "📝",
      count: "Coming Soon",
      color: "bg-amber-50 border-amber-200",
    },
    {
      title: "Best Practices",
      description:
        "Internal guidelines and best practices for case management and client service",
      icon: "⭐",
      count: "Coming Soon",
      color: "bg-rose-50 border-rose-200",
    },
    {
      title: "Templates & Forms",
      description:
        "Standard templates, forms, and documents used across different departments",
      icon: "📄",
      count: "Coming Soon",
      color: "bg-teal-50 border-teal-200",
    },
  ];

  return (
    <div>
      <Header
        title="Knowledge Center"
        description="FAQ articles, troubleshooting guides, and regulatory updates"
      />

      <div className="p-6 space-y-6">
        {/* Phase 2 Notice */}
        <div className="bg-muted/50 border border-dashed rounded-lg p-6 text-center space-y-2">
          <div className="text-4xl mb-2">📚</div>
          <h2 className="text-xl font-semibold">Knowledge Center</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The Knowledge Center will provide a centralized repository for FAQs,
            troubleshooting guides, regulatory updates, and client communication
            templates.
          </p>
          <Badge variant="secondary" className="mt-4">
            Coming in Phase 2
          </Badge>
        </div>

        {/* Preview Cards */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Planned Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {knowledgeCategories.map((category) => (
              <Card
                key={category.title}
                className={`${category.color} transition-all hover:shadow-md`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-2xl">{category.icon}</span>
                        {category.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {category.count}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Planned Capabilities */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Key Capabilities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search & Discovery</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Full-text search across all knowledge articles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Category-based browsing and filtering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Tag-based organization for easy navigation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Content Management
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Rich text editor for creating and editing content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Version control and change history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Review and approval workflow for updates</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Regulatory Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Automated tracking of regulatory changes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Impact analysis and client communication drafts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Deadline tracking for compliance updates</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Collaboration Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Comments and discussions on articles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Knowledge sharing across departments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Analytics on most-viewed and helpful articles</span>
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
