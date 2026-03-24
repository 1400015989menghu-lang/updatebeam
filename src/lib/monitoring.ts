import { z } from "zod";

export const SOURCE_CATEGORY_OPTIONS = [
  { value: "government", label: "Government" },
  { value: "tax", label: "Tax" },
  { value: "regulatory", label: "Regulatory" },
  { value: "other", label: "Other" },
] as const;

export const FEEDBACK_TYPE_OPTIONS = [
  { value: "general", label: "General feedback" },
  { value: "feature-request", label: "Feature request" },
  { value: "source-gap", label: "Missing source or coverage gap" },
  { value: "quality-issue", label: "Digest quality issue" },
] as const;

export const SOURCE_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "implemented", label: "Implemented" },
] as const;

export const FEEDBACK_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
] as const;

export const SOURCE_CATEGORY_LABELS = Object.fromEntries(
  SOURCE_CATEGORY_OPTIONS.map((item) => [item.value, item.label]),
) as Record<string, string>;

export const FEEDBACK_TYPE_LABELS = Object.fromEntries(
  FEEDBACK_TYPE_OPTIONS.map((item) => [item.value, item.label]),
) as Record<string, string>;

export const SOURCE_STATUS_LABELS = Object.fromEntries(
  SOURCE_STATUS_OPTIONS.map((item) => [item.value, item.label]),
) as Record<string, string>;

export const FEEDBACK_STATUS_LABELS = Object.fromEntries(
  FEEDBACK_STATUS_OPTIONS.map((item) => [item.value, item.label]),
) as Record<string, string>;

export const SEND_MINUTE_OPTIONS = [0, 15, 30, 45] as const;
export const DEFAULT_SUBSCRIBER_TIMEZONE = "Asia/Kuala_Lumpur";
export const DEFAULT_SEND_HOUR = 8;
export const DEFAULT_SEND_MINUTE = 0;

const sendMinuteSchema = z.union(
  SEND_MINUTE_OPTIONS.map((value) => z.literal(value)) as [
    z.ZodLiteral<0>,
    z.ZodLiteral<15>,
    z.ZodLiteral<30>,
    z.ZodLiteral<45>,
  ],
);

export const subscribeSchema = z.object({
  email: z.string().trim().email().max(320),
  sourceIds: z.array(z.string().trim().min(1)).min(1).max(20),
  timezone: z.string().trim().min(3).max(120).default(DEFAULT_SUBSCRIBER_TIMEZONE),
  preferredSendHour: z.number().int().min(0).max(23).default(DEFAULT_SEND_HOUR),
  preferredSendMinute: sendMinuteSchema.default(DEFAULT_SEND_MINUTE),
});

export const unsubscribeSchema = z.object({
  token: z.string().trim().min(12),
});

export const manageLookupSchema = z.object({
  token: z.string().trim().min(12),
});

export const manageSubscriptionSchema = z.object({
  token: z.string().trim().min(12),
  sourceIds: z.array(z.string().trim().min(1)).min(1).max(20),
  timezone: z.string().trim().min(3).max(120),
  preferredSendHour: z.number().int().min(0).max(23),
  preferredSendMinute: sendMinuteSchema,
});

export const sourceSubmissionSchema = z.object({
  siteName: z.string().trim().min(2).max(120),
  siteUrl: z.string().trim().url().max(500),
  description: z.string().trim().min(10).max(2000),
  contactEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  requestedCategory: z.enum(["government", "tax", "regulatory", "other"]).optional(),
});

export const feedbackSubmissionSchema = z.object({
  type: z.enum(["general", "feature-request", "source-gap", "quality-issue"]).default("general"),
  message: z.string().trim().min(10).max(2000),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  page: z.string().trim().max(500).optional().or(z.literal("")),
});

export const trackedSourceCreateSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  rootUrl: z.string().trim().url().max(500),
  category: z.enum(["government", "tax", "regulatory", "other"]),
  adapterType: z.enum(["hasil", "generic-html", "rss", "manual"]),
  timezone: z.string().trim().min(3).max(120).default("Asia/Kuala_Lumpur"),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
});

export const sourceSubmissionReviewSchema = z.object({
  status: z.enum(["new", "reviewing", "approved", "rejected", "implemented"]),
  reviewNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  trackedSourceId: z.string().trim().optional().or(z.literal("")),
});

export const feedbackReviewSchema = z.object({
  status: z.enum(["new", "reviewing", "resolved", "dismissed"]),
  adminNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createSecureToken(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.APP_URL?.trim()
    || "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export function buildConfirmUrl(token: string): string {
  return `${appBaseUrl()}/subscribe/confirm?token=${encodeURIComponent(token)}`;
}

export function buildUnsubscribeUrl(token: string): string {
  return `${appBaseUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildManageUrl(token: string): string {
  return `${appBaseUrl()}/manage?token=${encodeURIComponent(token)}`;
}

export async function sendResendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.MAIL_FROM || "briefing@updates.updatebeam.com";
  const fromName = process.env.MAIL_FROM_NAME || "UpdateBeam";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend request failed with HTTP ${response.status}: ${details}`);
  }

  return response.json();
}

export async function sendSubscriptionConfirmationEmail(input: {
  email: string;
  sourceNames: string[];
  token: string;
  timezone: string;
  preferredSendHour: number;
  preferredSendMinute: number;
}) {
  const confirmUrl = buildConfirmUrl(input.token);
  const unsubscribeHint = "If you did not request this, you can safely ignore this email.";
  const sourceList = input.sourceNames.map((source) => `- ${source}`).join("\n");
  const scheduleLine = `Preferred delivery time: ${formatSendTime(input.preferredSendHour, input.preferredSendMinute)} (${input.timezone}).`;
  const text = [
    "Confirm your UpdateBeam subscription",
    "",
    "You're almost done. Confirm your email to start receiving one daily monitoring digest for:",
    sourceList,
    "",
    scheduleLine,
    "",
    "What happens after confirmation:",
    "- Your selected sources are combined into one email",
    "- You can change sources or delivery time later from a secure manage link",
    "",
    `Confirm subscription: ${confirmUrl}`,
    "",
    unsubscribeHint,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h2 style="margin-bottom:8px">Confirm your UpdateBeam subscription</h2>
      <p>You're almost done. Confirm your email to start receiving one daily monitoring digest for:</p>
      <ul>${input.sourceNames.map((source) => `<li>${source}</li>`).join("")}</ul>
      <p>${scheduleLine}</p>
      <div style="margin:16px 0;padding:16px;border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc">
        <p style="margin:0 0 8px;font-weight:600;color:#0f172a">What happens after confirmation</p>
        <ul style="margin:0;padding-left:18px">
          <li>Your selected sources are combined into one daily email</li>
          <li>You can change sources or delivery time later from a secure manage link</li>
        </ul>
      </div>
      <p><a href="${confirmUrl}" style="display:inline-block;padding:12px 18px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:999px">Confirm subscription</a></p>
      <p style="color:#6b7280">${unsubscribeHint}</p>
    </div>
  `;

  return sendResendEmail({
    to: input.email,
    subject: "Confirm your UpdateBeam subscription",
    text,
    html,
  });
}

export function sourceGroupLabel(category: string): string {
  return SOURCE_CATEGORY_LABELS[category] || "Other";
}

export function truncateText(value: string | null | undefined, max = 180): string {
  const text = (value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function formatSendTime(hour: number, minute: number): string {
  const normalizedHour = Math.max(0, Math.min(23, hour));
  const normalizedMinute = Math.max(0, Math.min(59, minute));
  return `${String(normalizedHour).padStart(2, "0")}:${String(normalizedMinute).padStart(2, "0")}`;
}
