"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEND_MINUTE_OPTIONS, formatSendTime } from "@/lib/monitoring";

interface SourceOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  sourceTier: string;
  trustLabel: string;
  readinessLabel: string;
  isLive: boolean;
  isSubscribable: boolean;
}

interface ManageSubscriptionFormProps {
  token: string;
  unsubscribeToken: string;
  email: string;
  timezone: string;
  preferredSendHour: number;
  preferredSendMinute: number;
  activeSourceIds: string[];
  sources: SourceOption[];
}

const hourOptions = Array.from({ length: 24 }, (_, index) => index);
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

export function ManageSubscriptionForm({
  token,
  unsubscribeToken,
  email,
  timezone: initialTimezone,
  preferredSendHour: initialHour,
  preferredSendMinute: initialMinute,
  activeSourceIds,
  sources,
}: ManageSubscriptionFormProps) {
  const [timezone, setTimezone] = useState(initialTimezone);
  const [preferredSendHour, setPreferredSendHour] = useState(String(initialHour));
  const [preferredSendMinute, setPreferredSendMinute] = useState(String(initialMinute));
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => activeSourceIds.filter((id) => sources.find((source) => source.id === id && source.isSubscribable)),
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

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

  const deliveryPreview = useMemo(
    () => `${formatSendTime(Number(preferredSendHour), Number(preferredSendMinute))} (${timezone})`,
    [preferredSendHour, preferredSendMinute, timezone],
  );

  const selectedSources = useMemo(
    () => sources.filter((source) => selectedIds.includes(source.id)),
    [selectedIds, sources],
  );

  const liveSourceCount = useMemo(
    () => sources.filter((source) => source.isSubscribable).length,
    [sources],
  );
  const hasUnavailableSources = sources.some((source) => !source.isSubscribable);
  const canSave = status !== "loading" && selectedIds.length > 0;

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

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/public/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          sourceIds: selectedIds,
          timezone,
          preferredSendHour: Number(preferredSendHour),
          preferredSendMinute: Number(preferredSendMinute),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update subscription settings.");
      }
      setStatus("success");
      setMessage(
        `Settings saved. Your daily digest is scheduled for ${formatSendTime(
          Number(preferredSendHour),
          Number(preferredSendMinute),
        )} (${timezone}).`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to update subscription settings.");
    }
  }

  async function handleUnsubscribe() {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/public/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: unsubscribeToken }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to unsubscribe.");
      }
      setStatus("success");
      setMessage("You have been unsubscribed from all UpdateBeam daily digests.");
      setSelectedIds([]);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to unsubscribe.");
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/20"
    >
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            Manage subscription
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Update your digest settings
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            You are managing <span className="font-medium text-slate-950">{email}</span>. Choose the
            sources you want and the time your team should receive the daily digest.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current email</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{email}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected sources</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{selectedIds.length} active source(s)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery preview</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{deliveryPreview}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step 1</p>
            <p className="mt-1 text-sm font-medium text-slate-900">Review sources</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step 2</p>
            <p className="mt-1 text-sm font-medium text-slate-900">Adjust delivery time</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Step 3</p>
            <p className="mt-1 text-sm font-medium text-slate-900">Save or unsubscribe</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-medium text-slate-800">Subscribed sources</p>
          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Your digest combines all selected sources into one daily email and sends it at{" "}
            <span className="font-medium text-slate-900">{deliveryPreview}</span>.
            {hasUnavailableSources
              ? " Some cataloged sources remain visible here for planning, but only live sources can stay in your automatic digest."
              : ""}
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
                          {source.description ? (
                            <p className="mt-1 text-sm text-slate-600">{source.description}</p>
                          ) : null}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
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
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-950">Delivery settings</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep one local delivery time for the combined digest. UpdateBeam will use this schedule for every selected source.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_0.5fr_0.5fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Timezone</label>
              <Input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="Asia/Shanghai"
                className="h-12 rounded-2xl border-slate-300 bg-white"
              />
              <p className="mt-2 text-xs text-slate-500">
                Use an IANA timezone like Asia/Shanghai or Europe/London.
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Hour</label>
              <Select value={preferredSendHour} onValueChange={(value) => setPreferredSendHour(value ?? "8")}>
                <SelectTrigger className="h-12 w-full rounded-2xl border-slate-300 bg-white">
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
              <Select value={preferredSendMinute} onValueChange={(value) => setPreferredSendMinute(value ?? "0")}>
                <SelectTrigger className="h-12 w-full rounded-2xl border-slate-300 bg-white">
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

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={!canSave}
              className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
            >
              {status === "loading" ? "Saving..." : liveSourceCount === 0 ? "No live sources available" : "Save settings"}
            </Button>
            <Button type="button" variant="outline" className="h-12 rounded-full px-6" onClick={handleUnsubscribe}>
              Unsubscribe all
            </Button>
          </div>
          <Link href="/" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
            Return home
          </Link>
        </div>

        {message ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
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
