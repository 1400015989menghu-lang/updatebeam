"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_SEND_HOUR,
  DEFAULT_SEND_MINUTE,
  DEFAULT_SUBSCRIBER_TIMEZONE,
  SEND_MINUTE_OPTIONS,
} from "@/lib/monitoring";
import { clearEnglishValidationMessage, setEnglishValidationMessage } from "@/lib/public-form-validation";

interface SourceOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  sourceTier?: string;
  trustLabel?: string;
  readinessLabel?: string;
  isLive?: boolean;
  isSubscribable?: boolean;
}

const SOURCE_TIER_LABELS: Record<string, string> = {
  official: "Official / legislation / official portals",
  professional: "Professional bodies",
  vendor: "Vendor / software sources",
  competitor: "Competitor / commentary sources",
  social: "Social / video channels",
  other: "Other sources",
};

const SOURCE_TIER_ORDER = ["official", "professional", "vendor", "competitor", "social", "other"];

function getSourceTierKey(sourceTier: string | undefined | null) {
  return (sourceTier || "other").trim().toLowerCase();
}

function getSourceTierLabel(sourceTier: string | undefined | null) {
  const key = getSourceTierKey(sourceTier);
  return SOURCE_TIER_LABELS[key] || sourceTier || "Other sources";
}

function getInitialSelection(sources: SourceOption[]) {
  const firstLiveSource = sources.find((source) => source.isSubscribable);
  return firstLiveSource ? [firstLiveSource.id] : [];
}

function normalizeSource(source: SourceOption, index: number): SourceOption {
  const sourceTier = getSourceTierKey(source.sourceTier);
  const isLive = Boolean(source.isLive);
  const isSubscribable = Boolean(source.isSubscribable ?? isLive);

  return {
    id: source.id || `source-${index}`,
    slug: source.slug || `source-${index}`,
    name: source.name || "Untitled source",
    description: source.description ?? null,
    category: source.category || "other",
    sourceTier,
    trustLabel: source.trustLabel || "Unspecified trust",
    readinessLabel: source.readinessLabel || (isSubscribable ? "Live now" : "Manual review only"),
    isLive,
    isSubscribable,
  };
}

export function SubscribeForm({
  sources: rawSources = [],
  compact = false,
}: {
  sources?: SourceOption[];
  compact?: boolean;
}) {
  const sources = useMemo(
    () => (Array.isArray(rawSources) ? rawSources : []).map((source, index) => normalizeSource(source, index)),
    [rawSources],
  );
  const [email, setEmail] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => getInitialSelection(sources));
  const [timezone, setTimezone] = useState(DEFAULT_SUBSCRIBER_TIMEZONE);
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [preferredSendHour, setPreferredSendHour] = useState(String(DEFAULT_SEND_HOUR));
  const [preferredSendMinute, setPreferredSendMinute] = useState(String(DEFAULT_SEND_MINUTE));
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setHasMounted(true);

    try {
      const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (localTimezone) {
        setTimezone(localTimezone);
        setDetectedTimezone(localTimezone);
      }
    } catch (error) {
      console.error("Failed to detect browser timezone", error);
    }
  }, []);

  const groupedSources = useMemo(() => {
    return sources.reduce<Record<string, SourceOption[]>>((groups, source) => {
      const key = getSourceTierKey(source.sourceTier);
      groups[key] = groups[key] || [];
      groups[key].push(source);
      return groups;
    }, {});
  }, [sources]);

  const sourceTierKeys = useMemo(() => {
    const keys = Object.keys(groupedSources);
    return [
      ...SOURCE_TIER_ORDER.filter((tier) => keys.includes(tier)),
      ...keys.filter((tier) => !SOURCE_TIER_ORDER.includes(tier)),
    ];
  }, [groupedSources]);

  const sourceMap = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const liveSourceCount = useMemo(
    () => sources.filter((source) => source.isSubscribable).length,
    [sources],
  );

  const selectedSources = useMemo(
    () => sources.filter((source) => selectedIds.includes(source.id)),
    [selectedIds, sources],
  );

  const hasUnavailableSources = sources.some((source) => !source.isSubscribable);
  const canSubmit = status !== "loading" && liveSourceCount > 0 && selectedIds.length > 0;

  const deliveryPreview = useMemo(() => {
    return `${String(preferredSendHour).padStart(2, "0")}:${String(preferredSendMinute).padStart(2, "0")} ${timezone}`;
  }, [preferredSendHour, preferredSendMinute, timezone]);

  useEffect(() => {
    setSelectedIds((current) => {
      const validIds = current.filter((id) => sourceMap.get(id)?.isSubscribable);
      if (validIds.length > 0) {
        return validIds;
      }
      return getInitialSelection(sources);
    });
  }, [sourceMap, sources]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/public/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          sourceIds: selectedIds,
          timezone,
          preferredSendHour: Number(preferredSendHour),
          preferredSendMinute: Number(preferredSendMinute),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Subscription failed.");
      }
      setStatus("success");
      setMessage("Check your inbox, click the confirmation link, and your daily digest will start with the delivery time you selected.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Subscription failed.");
    }
  }

  function toggleSource(id: string, checked: boolean) {
    const source = sourceMap.get(id);
    if (!source?.isSubscribable) {
      return;
    }

    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((value) => value !== id);
    });
  }

  const hourOptions = Array.from({ length: 24 }, (_, index) => index);

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/30">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {compact ? "Start your digest" : "Start a free subscription"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {compact ? "Choose sources, enter email, and set delivery time" : "Pick your sources, enter your email, and set a local send time"}
            </h2>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700">
            No login required
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step 1</p>
            <p className="mt-1 text-sm font-medium text-slate-900">Choose sources</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step 2</p>
            <p className="mt-1 text-sm font-medium text-slate-900">Enter email address</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step 3</p>
            <p className="mt-1 text-sm font-medium text-slate-900">Set local delivery time</p>
          </div>
        </div>
      </div>

      <div className={compact ? "space-y-3" : "space-y-4"}>
        <div>
          <p className="mb-3 text-sm font-medium text-slate-800">Choose sources</p>
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            <span className="font-medium text-slate-950">{liveSourceCount}</span> live source
            {liveSourceCount === 1 ? "" : "s"} can be selected right now.
            {hasUnavailableSources
              ? " Some cataloged sources remain visible for planning only. Review-only sources stay locked because they still require manual review instead of automatic digest delivery."
              : ""}
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              {selectedSources.length} selected
            </span>
            {selectedSources.slice(0, 2).map((source) => (
              <span key={source.id} className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                {source.name}
              </span>
            ))}
            {selectedSources.length > 2 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                +{selectedSources.length - 2} more
              </span>
            ) : null}
          </div>

          <div className="space-y-4">
            {sourceTierKeys.map((sourceTier) => {
              const tierSources = groupedSources[sourceTier] || [];
              const tierLiveCount = tierSources.filter((source) => source.isSubscribable).length;
              const tierUnavailableCount = tierSources.length - tierLiveCount;

              return (
                <div key={sourceTier} className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {getSourceTierLabel(sourceTier)}
                    </p>
                    <span className="text-[11px] font-medium text-slate-500">
                      {tierLiveCount} live{tierUnavailableCount ? `, ${tierUnavailableCount} planning-only` : ""}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {tierSources.map((source) => (
                      <label
                        key={source.id}
                        className={`flex items-start gap-3 rounded-2xl border p-3 transition ${
                          source.isSubscribable
                            ? "cursor-pointer border-slate-200 bg-white hover:border-slate-300"
                            : "cursor-not-allowed border-slate-200 bg-slate-50/80"
                        }`}
                      >
                        <Checkbox
                          checked={selectedIds.includes(source.id)}
                          disabled={!source.isSubscribable}
                          onCheckedChange={(checked) => toggleSource(source.id, checked === true)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-slate-900">{source.name}</div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                              {source.trustLabel}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                source.isSubscribable
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {source.readinessLabel}
                            </span>
                          </div>
                          {source.description && (
                            <p className="mt-1 text-sm leading-6 text-slate-600">{source.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">Email address</label>
          <Input
            type="email"
            value={email}
            onChange={(event) => {
              clearEnglishValidationMessage(event);
              setEmail(event.target.value);
            }}
            onInvalid={(event) => setEnglishValidationMessage(event, "Email address")}
            placeholder="you@example.com"
            required
            className="h-12 rounded-2xl border-slate-300"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_0.5fr_0.5fr]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Timezone</label>
            <Input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Asia/Shanghai"
              className="h-12 rounded-2xl border-slate-300"
            />
            <p className="mt-2 text-xs text-slate-500">
              {hasMounted && detectedTimezone
                ? `Detected from your browser: ${detectedTimezone}. You can change it if needed.`
                : "Use an IANA timezone like Asia/Shanghai or Europe/London."}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Hour</label>
            <Select value={preferredSendHour} onValueChange={(value) => setPreferredSendHour(value ?? String(DEFAULT_SEND_HOUR))}>
              <SelectTrigger className="h-12 w-full rounded-2xl border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {String(hour).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Minute</label>
            <Select value={preferredSendMinute} onValueChange={(value) => setPreferredSendMinute(value ?? String(DEFAULT_SEND_MINUTE))}>
              <SelectTrigger className="h-12 w-full rounded-2xl border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEND_MINUTE_OPTIONS.map((minute) => (
                  <SelectItem key={minute} value={String(minute)}>
                    {String(minute).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
        >
          {status === "loading"
            ? "Submitting..."
            : liveSourceCount === 0
              ? "No live sources available"
              : "Start free subscription"}
        </Button>
        <p className="text-xs leading-5 text-slate-500">
          Daily digests. Double opt-in. Set your own delivery time. No account required.
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-medium text-slate-950">What happens next</p>
        <p className="mt-2 leading-6 text-slate-600">
          After you confirm once by email, your combined digest will arrive around <span className="font-medium text-slate-900">{deliveryPreview}</span>. You can update sources, timezone, or unsubscribe later from your secure manage link.
        </p>
        {message ? (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
              status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
          >
            {message}
          </div>
        ) : null}
      </div>
    </form>
  );
}
