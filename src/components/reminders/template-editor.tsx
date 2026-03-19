"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS, REMINDER_CHANNEL, REMINDER_TYPES } from "@/lib/constants";
import { Info } from "lucide-react";

interface Template {
  id?: string;
  name: string;
  department: keyof typeof DEPARTMENTS;
  channel: keyof typeof REMINDER_CHANNEL;
  type: keyof typeof REMINDER_TYPES;
  subject?: string;
  body: string;
  placeholders?: string[];
}

interface TemplateEditorProps {
  template?: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: Omit<Template, "id"> & { id?: string }) => Promise<void>;
}

const COMMON_PLACEHOLDERS = [
  { key: "{{clientName}}", description: "Client's full name" },
  { key: "{{caseNumber}}", description: "Case reference number" },
  { key: "{{caseName}}", description: "Case name/title" },
  { key: "{{dueDate}}", description: "Due date for submission" },
  { key: "{{documentName}}", description: "Name of required document" },
  { key: "{{amount}}", description: "Payment amount" },
  { key: "{{contactPerson}}", description: "Contact person name" },
  { key: "{{companyName}}", description: "Company name" },
  { key: "{{portalLink}}", description: "Client portal link" },
];

export function TemplateEditor({ template, open, onOpenChange, onSave }: TemplateEditorProps) {
  const [formData, setFormData] = useState<Omit<Template, "id"> & { id?: string }>({
    name: "",
    department: "SECRETARIAL",
    channel: "EMAIL",
    type: "GENERAL",
    subject: "",
    body: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template) {
      setFormData({
        id: template.id,
        name: template.name,
        department: template.department,
        channel: template.channel,
        type: template.type,
        subject: template.subject || "",
        body: template.body,
      });
    } else {
      setFormData({
        name: "",
        department: "SECRETARIAL",
        channel: "EMAIL",
        type: "GENERAL",
        subject: "",
        body: "",
      });
    }
    setErrors({});
  }, [template, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Template name is required";
    }

    if (formData.channel === "EMAIL" && !formData.subject?.trim()) {
      newErrors.subject = "Email subject is required";
    }

    if (!formData.body.trim()) {
      newErrors.body = "Message body is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save template:", error);
    } finally {
      setLoading(false);
    }
  };

  const insertPlaceholder = (placeholder: string, field: "subject" | "body") => {
    const textarea = document.getElementById(field) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = field === "subject" ? formData.subject || "" : formData.body;
    const newValue =
      currentValue.substring(0, start) + placeholder + currentValue.substring(end);

    setFormData({ ...formData, [field]: newValue });

    // Set cursor position after placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            Create reusable reminder templates with placeholders for dynamic content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)] pr-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">
                Template Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., AR First Reminder - Email"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) =>
                  setFormData({ ...formData, department: value as keyof typeof DEPARTMENTS })
                }
              >
                <SelectTrigger id="department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(DEPARTMENTS).map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={formData.channel}
                onValueChange={(value) => {
                  const newChannel = value as keyof typeof REMINDER_CHANNEL;
                  setFormData({
                    ...formData,
                    channel: newChannel,
                    subject: newChannel === "WHATSAPP" ? undefined : formData.subject,
                  });
                }}
              >
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="type">Reminder Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as keyof typeof REMINDER_TYPES })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(REMINDER_TYPES).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Placeholders Help */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-400">
                  Available Placeholders
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                  Click any placeholder below to insert it at the cursor position
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {COMMON_PLACEHOLDERS.map((ph) => (
                    <Button
                      key={ph.key}
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() =>
                        insertPlaceholder(
                          ph.key,
                          formData.channel === "EMAIL" && document.activeElement?.id === "subject"
                            ? "subject"
                            : "body"
                        )
                      }
                      className="text-xs h-7"
                      title={ph.description}
                    >
                      {ph.key}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Subject (Email only) */}
          {formData.channel === "EMAIL" && (
            <div>
              <Label htmlFor="subject">
                Email Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                value={formData.subject || ""}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Reminder: {{caseName}} - Document Submission Due"
                className={errors.subject ? "border-red-500" : ""}
              />
              {errors.subject && (
                <p className="text-xs text-red-500 mt-1">{errors.subject}</p>
              )}
            </div>
          )}

          {/* Body */}
          <div>
            <Label htmlFor="body">
              Message Body <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder={`Dear {{clientName}},

This is a reminder regarding your {{caseName}} case.

Please submit the required documents by {{dueDate}}.

If you have any questions, please contact {{contactPerson}}.

Best regards,
Your Team`}
              className={`min-h-[300px] ${errors.body ? "border-red-500" : ""}`}
            />
            {errors.body && (
              <p className="text-xs text-red-500 mt-1">{errors.body}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : template ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
