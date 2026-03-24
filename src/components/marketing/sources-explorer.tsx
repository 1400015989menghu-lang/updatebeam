"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MarketingErrorBoundary } from "@/components/marketing/marketing-error-boundary";
import { SubscribeForm } from "@/components/marketing/subscribe-form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sourceGroupLabel } from "@/lib/monitoring";

interface SourceOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rootUrl: string;
  category: string;
  timezone: string;
  adapterType: string;
  subscriberCount: number;
  sourceTier?: string;
  trustLabel?: string;
  sourceTypeLabel?: string;
  readinessLabel?: string;
  isLive?: boolean;
  isSubscribable?: boolean;
  ctaMode?: string;
  sourceType?: string;
  trustTier?: string;
  reviewMode?: string;
  reviewModeLabel?: string;
}

type SubscribeSourceOption = {
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
};

const tierOrder = ["official", "professional", "vendor", "competitor", "social", "other"] as const;

const tierMeta: Record<string, { title: string; description: string; badge: string }> = {
  official: {
    title: "Official sources",
    description: "Government, legislation, and portal sources that anchor the core monitoring workflow.",
    badge: "Official / legislation / portal",
  },
  professional: {
    title: "Professional bodies",
    description: "Accounting and professional institutions that shape guidance, standards, and technical practice.",
    badge: "Professional bodies",
  },
  vendor: {
    title: "Vendor sources",
    description: "Product and software updates that matter when the monitoring workflow touches tooling.",
    badge: "Vendor / software",
  },
  competitor: {
    title: "Competitor coverage",
    description: "Commentary and market-facing updates from firms the team may benchmark against.",
    badge: "Competitor / commentary",
  },
  social: {
    title: "Social and video channels",
    description: "Lightweight distribution channels that still deserve a clear place in the catalog.",
    badge: "Social / video",
  },
  other: {
    title: "Other sources",
    description: "Additional public sources that do not yet fit the standard taxonomy.",
    badge: "Other",
  },
};

function startCase(value: string) {
  return value
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((item) => `${item.slice(0, 1).toUpperCase()}${item.slice(1)}`)
    .join(" ");
}

function deriveSourceTier(source: SourceOption) {
  if (source.sourceTier) {
    return source.sourceTier;
  }

  if (source.category === "government" || source.category === "tax") {
    return "official";
  }

  if (source.sourceType === "professional-body") {
    return "professional";
  }

  if (source.sourceType === "software-vendor") {
    return "vendor";
  }

  if (source.sourceType === "competitor-firm") {
    return "competitor";
  }

  if (source.sourceType === "social-channel" || source.sourceType === "video-channel") {
    return "social";
  }

  return "other";
}

function deriveTrustLabel(source: SourceOption) {
  return source.trustLabel || source.trustTier || "Unspecified trust";
}

function deriveSourceTypeLabel(source: SourceOption) {
  if (source.sourceTypeLabel) {
    return source.sourceTypeLabel;
  }

  return source.sourceType ? startCase(source.sourceType) : startCase(source.adapterType || "source");
}

function deriveReadinessLabel(source: SourceOption) {
  if (source.readinessLabel) {
    return source.readinessLabel;
  }

  if (source.reviewMode === "review-only") {
    return "Manual review only";
  }

  if (source.isLive) {
    return "Live now";
  }

  return "Coming soon";
}

function deriveCtaMode(source: SourceOption) {
  if (source.ctaMode) {
    return source.ctaMode;
  }

  return source.isSubscribable || source.isLive ? "live" : "coming-soon";
}

export function SourcesExplorer({
  sources: rawSources = [],
}: {
  sources?: SourceOption[];
}) {
  const sources = useMemo(
    () => (Array.isArray(rawSources) ? rawSources : []).map((source) => ({
      ...source,
      id: source.id || source.slug || source.name || "source",
      slug: source.slug || source.id || "source",
      name: source.name || "Untitled source",
      description: source.description ?? null,
      rootUrl: source.rootUrl || "",
      category: source.category || "other",
      timezone: source.timezone || "Asia/Kuala_Lumpur",
      adapterType: source.adapterType || "generic-html",
      subscriberCount: Number(source.subscriberCount || 0),
      isLive: Boolean(source.isLive),
      isSubscribable: Boolean(source.isSubscribable ?? source.isLive),
      sourceTier: deriveSourceTier(source),
      trustLabel: deriveTrustLabel(source),
      sourceTypeLabel: deriveSourceTypeLabel(source),
      readinessLabel: deriveReadinessLabel(source),
      ctaMode: deriveCtaMode(source),
      reviewMode: source.reviewMode || "automatic",
      reviewModeLabel: source.reviewModeLabel || (source.reviewMode === "review-only" ? "Manual review only" : "Automatic monitoring"),
    })),
    [rawSources],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => ["all", ...new Set(sources.map((source) => source.category))],
    [sources],
  );

  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sources.filter((source) => {
      const matchesCategory = category === "all" || source.category === category;
      const matchesQuery =
        !normalizedQuery
        || source.name.toLowerCase().includes(normalizedQuery)
        || source.slug.toLowerCase().includes(normalizedQuery)
        || source.description?.toLowerCase().includes(normalizedQuery)
        || source.rootUrl.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query, sources]);

  const sourcesByTier = useMemo(() => {
    const groups = tierOrder.reduce<Record<string, SourceOption[]>>((acc, tier) => {
      acc[tier] = [];
      return acc;
    }, {});

    for (const source of filteredSources) {
      const tier = deriveSourceTier(source);
      (groups[tier] || groups.other).push(source);
    }

    return groups;
  }, [filteredSources]);

  const visibleTiers = tierOrder.filter((tier) => (sourcesByTier[tier] || []).length > 0);
  const subscribeSources: SubscribeSourceOption[] = sources.map((source) => ({
    id: source.id,
    slug: source.slug,
    name: source.name,
    description: source.description,
    category: source.category,
    sourceTier: deriveSourceTier(source),
    trustLabel: deriveTrustLabel(source),
    readinessLabel: deriveReadinessLabel(source),
    isLive: Boolean(source.isLive),
    isSubscribable: Boolean(source.isSubscribable ?? source.isLive),
  }));

  return (
    <div id="source-browser" className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[1.9rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.3)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Source browser</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Search, filter, and compare the public sources available today.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm shadow-slate-200/30">
              {filteredSources.length} source(s)
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Search sources</label>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by source name, URL, or use case"
                className="h-12 rounded-2xl border-slate-300"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Category</label>
              <Select value={category} onValueChange={(value) => setCategory(value ?? "all")}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "All categories" : sourceGroupLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              Combined digest
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              Subscriber-selected delivery time
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              Tiered by trust and source type
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {visibleTiers.map((tier) => {
            const tierSources = sourcesByTier[tier] || [];
            const meta = tierMeta[tier] || tierMeta.other;
            return (
              <section key={tier} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {meta.badge}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      {meta.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                      {meta.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    {tierSources.length} source{tierSources.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-4">
                  {tierSources.map((source) => {
                    const isLive = Boolean(source.isLive ?? source.isSubscribable);
                    const isReviewOnly = source.reviewMode === "review-only";
                    const readinessLabel = deriveReadinessLabel({
                      ...source,
                      isLive,
                    });
                    return (
                      <div
                        key={source.id}
                        className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.26)]"
                      >
                        <div className="space-y-5">
                          <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <h3 className="text-xl font-semibold text-slate-950">{source.name}</h3>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                  {sourceGroupLabel(source.category)}
                                </span>
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${isLive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                  {readinessLabel}
                                </span>
                              </div>
                              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                                {source.description || "Daily monitoring for verified public changes and official updates."}
                              </p>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                                  Trust: {deriveTrustLabel(source)}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                                  Type: {deriveSourceTypeLabel(source)}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                                  Source timezone: {source.timezone}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 px-6 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                              <p className="font-medium text-slate-950">
                                {isLive ? "Included in the digest" : isReviewOnly ? "Manual review only" : "Coming soon"}
                              </p>
                              <ul className="mt-3 space-y-2">
                                {isLive ? (
                                  <>
                                    <li>Verified public changes only</li>
                                    <li>Grouped by source and label</li>
                                    <li>Delivered at your local time</li>
                                  </>
                                ) : isReviewOnly ? (
                                  <>
                                    <li>Profile is visible now for source planning</li>
                                    <li>This source is monitored through manual review today</li>
                                    <li>Automatic digest delivery is not available yet</li>
                                  </>
                                ) : (
                                  <>
                                    <li>Profile is visible now for planning and review</li>
                                    <li>Subscription opens once live updates are available</li>
                                    <li>Official source link stays available in the meantime</li>
                                  </>
                                )}
                              </ul>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                              <p className="font-medium text-slate-950">
                                {isLive ? "Typical fit" : isReviewOnly ? "Why it stays visible" : "Why this matters"}
                              </p>
                              <p className="mt-2 leading-6">
                                {isLive
                                  ? "Use this source when your team needs a stable record of public updates without manually revisiting the site every morning."
                                  : isReviewOnly
                                    ? "This source is cataloged because teams still need its trust context and official links, even though delivery currently depends on manual review."
                                    : "This source is cataloged so teams can review coverage, trust level, and likely fit before the live monitoring feed is opened."}
                              </p>
                            </div>
                          </div>

                        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5">
                          <span className="text-sm text-slate-500">
                            {isLive
                              ? "Live source ready for subscription and daily monitoring"
                              : isReviewOnly
                                ? "Manual review only - visible in the catalog, but not available for automatic subscription"
                                : "Coming soon - review the profile and request coverage if this is a priority"}
                          </span>
                            <div className="flex flex-wrap gap-3">
                              <Link
                                href={`/sources/${source.slug}`}
                                className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
                              >
                                View source profile
                              </Link>
                              <a
                                href={source.rootUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-medium text-slate-950 transition hover:border-slate-950"
                              >
                                Visit official source
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {filteredSources.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-lg shadow-slate-200/20">
              <p className="text-lg font-medium text-slate-950">No source matches your current filters</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Try another keyword or request the public source your team wants us to monitor next.
              </p>
              <Link href="/request-a-source" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800">
                Request a source
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div id="subscribe-panel" className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-4">
          <MarketingErrorBoundary
            title="The subscription panel could not finish rendering."
            description="You can still browse source profiles below. Reload once if you want to start a subscription from this page."
          >
            <SubscribeForm
              compact
              sources={subscribeSources}
            />
          </MarketingErrorBoundary>
          <div className="rounded-[1.9rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.3)]">
            <p className="text-sm font-semibold text-slate-950">Need another source?</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              If your team needs a public site that is not listed here, submit it and we will review demand for manual adapter implementation.
            </p>
            <Link href="/request-a-source" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800">
              Request a source
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
