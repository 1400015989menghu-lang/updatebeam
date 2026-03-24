import Link from "next/link";
import { MarketingErrorBoundary } from "@/components/marketing/marketing-error-boundary";
import { PublicShell } from "@/components/marketing/public-shell";
import { SourcesExplorer } from "@/components/marketing/sources-explorer";
import { listPublicTrackedSources } from "@/lib/monitoring-service";
import { buildMetadata } from "@/lib/seo";
import {
  buildSourcesStructuredData,
  publicUseCasePages,
  sourcePageKeywords,
} from "@/lib/public-site";
import { listRecentPublicUpdates } from "@/lib/monitoring-service";

export const metadata = buildMetadata({
  title: "Browse monitored public sources for one daily digest",
  description: "Explore the public sources currently supported by UpdateBeam and subscribe to one verified daily digest for your team.",
  path: "/sources",
  keywords: sourcePageKeywords,
});

export default async function SourcesPage() {
  const sources = (await listPublicTrackedSources()).map((source) => ({
    ...source,
    description: source.description ?? null,
    rootUrl: source.rootUrl || "",
    category: source.category || "other",
    timezone: source.timezone || "Asia/Kuala_Lumpur",
    adapterType: source.adapterType || "generic-html",
    subscriberCount: Number(source.subscriberCount || 0),
    sourceTier: source.sourceTier || "other",
    trustLabel: source.trustLabel || source.trustTier || "Unspecified trust",
    sourceTypeLabel: source.sourceTypeLabel || source.sourceType || "Source",
    readinessLabel: source.readinessLabel || (source.isLive ? "Live now" : "Coming soon"),
    isLive: Boolean(source.isLive),
    isSubscribable: Boolean(source.isSubscribable ?? source.isLive),
  }));
  const recentUpdates = await listRecentPublicUpdates(2);
  const totalSubscribers = sources.reduce((sum, source) => sum + source.subscriberCount, 0);
  const liveSourceCount = sources.filter((source) => source.isLive).length;
  const normalizedSources = sources;
  const structuredData = buildSourcesStructuredData({
    sourceCount: normalizedSources.length,
    sources: normalizedSources.map((source) => ({
      name: source.name,
      url: source.rootUrl,
      description: source.description,
    })),
  });

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="space-y-10">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Sources</p>
              <h1 className="text-5xl font-semibold tracking-tight text-slate-950 md:text-[4.2rem] md:leading-[0.95]">
                Choose the public sources worth turning into a repeatable daily briefing
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Review the public source profiles available today, then subscribe only to the sources that are already live and producing digest-ready updates.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">Searchable source catalog</span>
                <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">Combined digest delivery</span>
                <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">Subscriber-set local send time</span>
                <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">Tiered by trust and source type</span>
              </div>
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#ecfdf5_100%)] shadow-[0_20px_60px_-42px_rgba(15,23,42,0.25)]">
                <div className="grid gap-0 divide-y divide-slate-200/80 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                  <div className="px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Public profiles</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{sources.length}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Visible source profiles across all trust tiers</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live sources</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{liveSourceCount}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Sources already producing public updates</p>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active subscribers</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{totalSubscribers}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Current verified subscriptions across live sources</p>
                  </div>
                  <div className="px-4 py-4 sm:col-span-2 lg:col-span-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery model</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">1 digest / day</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Sent at each subscriber’s chosen local time</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[2.1rem] border border-slate-200 bg-slate-950 p-7 text-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.6)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Browse first, subscribe fast</p>
              <p className="mt-3 text-xl leading-8 text-white">
                The source browser below is the working surface. Filter the catalog, compare fit, then start a combined digest without leaving the page.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-sm font-medium text-white">For ops workflows</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Choose the public sites that must be checked every morning and route them into one inbox summary.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-sm font-medium text-white">For expanding coverage</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Start with the sources already live today, then request new public sites as the monitoring map grows.</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/sources#source-browser"
                  className="inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  Browse sources
                </Link>
                <Link
                  href="/request-a-source"
                  className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
                >
                  Request another source
                </Link>
              </div>
            </div>
          </div>

          <MarketingErrorBoundary
            title="The source browser could not finish rendering."
            description="Summary content is still available on this page. Reload once to retry the interactive catalog."
          >
            <SourcesExplorer sources={normalizedSources} />
          </MarketingErrorBoundary>

          <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="space-y-4 pt-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How teams use this page</p>
              <h2 className="max-w-lg text-3xl font-semibold text-slate-950">Pick a source mix that matches your reporting rhythm</h2>
              <p className="max-w-md text-sm leading-7 text-slate-600">
                Compliance teams often combine government and regulatory sources, while tax operations usually start with a smaller set of official sites and expand later through source requests.
              </p>
              <Link
                href="/request-a-source"
                className="inline-flex h-12 items-center rounded-full border border-slate-300 px-6 text-sm font-medium text-slate-950 transition hover:border-slate-950"
              >
                Request another source
              </Link>
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/88 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.3)] backdrop-blur-sm">
              <div className="divide-y divide-slate-200/80">
                <div className="grid gap-3 px-6 py-5 md:grid-cols-[180px_1fr] md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Starting point</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">Tax operations</h3>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">
                    Start with the official sites your tax team already revisits every week, then add new sources as filing cycles or e-Invoice workflows expand.
                  </p>
                </div>
                <div className="grid gap-3 px-6 py-5 md:grid-cols-[180px_1fr] md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Starting point</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">Compliance operations</h3>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">
                    Combine government and regulatory sources into one digest so daily triage and cross-functional escalation start from a single inbox summary.
                  </p>
                </div>
                <div className="grid gap-3 px-6 py-5 md:grid-cols-[180px_1fr] md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Starting point</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">Regional monitoring</h3>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">
                    Let each subscriber set a local delivery time so teams in different markets receive the same monitoring workflow at the right hour.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/20">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selected public updates</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">See what a publish-worthy public change looks like</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                We do not expose every digest. Instead, we selectively publish a small set of high-value update pages that can stand on their own in search and in workflows.
              </p>
              <div className="mt-6 space-y-4">
                {recentUpdates.length ? recentUpdates.map((update) => (
                  <div key={update.slug} className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{update.label}</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-950">{update.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{update.summary}</p>
                    <Link
                      href={`/updates/${update.sourceSlug}/${update.slug}`}
                      className="mt-3 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Open selected update
                    </Link>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                    No selected public updates have been published yet. Once a source produces a high-value prior-day record, it will appear here instead of an empty digest mirror.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-lg shadow-slate-200/20">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Use cases</p>
              <h2 className="mt-3 text-2xl font-semibold">Match source selection to how your team actually works</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Start from the workflow first, then subscribe to the public sources that support that operating rhythm.
              </p>
              <div className="mt-6 space-y-4">
                {publicUseCasePages.map((page) => (
                  <div key={page.slug} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">{page.audience}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{page.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{page.summary}</p>
                    <Link
                      href={`/use-cases/${page.slug}`}
                      className="mt-3 inline-flex text-sm font-medium text-white hover:text-emerald-200"
                    >
                      Explore use case
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </PublicShell>
  );
}
