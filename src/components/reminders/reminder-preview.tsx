"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { REMINDER_CHANNEL } from "@/lib/constants";
import { Mail, MessageSquare } from "lucide-react";

interface ReminderPreviewProps {
  channel: keyof typeof REMINDER_CHANNEL;
  subject?: string;
  body: string;
  recipientName?: string;
  recipientContact?: string;
}

export function ReminderPreview({
  channel,
  subject,
  body,
  recipientName,
  recipientContact,
}: ReminderPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {channel === "EMAIL" ? (
            <Mail className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          <span>Message Preview</span>
          <Badge variant="outline">
            {channel === "EMAIL" ? "Email" : "WhatsApp"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recipient */}
        {(recipientName || recipientContact) && (
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <div className="mt-1 text-sm">
              {recipientName && <div className="font-medium">{recipientName}</div>}
              {recipientContact && (
                <div className="text-muted-foreground">{recipientContact}</div>
              )}
            </div>
          </div>
        )}

        {/* Subject (Email only) */}
        {channel === "EMAIL" && subject && (
          <div>
            <Label className="text-xs text-muted-foreground">Subject</Label>
            <div className="mt-1 text-sm font-medium">{subject}</div>
          </div>
        )}

        {/* Body */}
        <div>
          <Label className="text-xs text-muted-foreground">Message</Label>
          <div className="mt-2 p-4 bg-muted rounded-md border">
            <pre className="whitespace-pre-wrap text-sm font-sans">{body}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
