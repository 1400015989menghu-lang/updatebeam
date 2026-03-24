import Link from "next/link";
import { MarketingErrorBoundary } from "@/components/marketing/marketing-error-boundary";
import { PublicShell } from "@/components/marketing/public-shell";
import { SubscribeForm } from "@/components/marketing/subscribe-form";
import { listPublicTrackedSources, listRecentPublicUpdates } from "@/lib/monitoring-service";
import {
  faqItems,
  homepageStructuredData,
  publicUseCasePages,
  seoKeywordClusters,
  siteDescription,
} from "@/lib/public-site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Daily monitoring digests for public tax and regulatory sources",
  description: siteDescription,
  path: "/",
  keywords: seoKeywordClusters,
});

export default async function LandingPage() {
  const sources = (await listPublicTrackedSources()).map((source) => ({
    ...source,
    description: source.description ?? null,
    category: source.category || "other",
    sourceTier: source.sourceTier || "other",
    trustLabel: source.trustLabel || source.trustTier || "Unspecified trust",
    readinessLabel: source.readinessLabel || (source.isLive ? "Live now" : "Coming soon"),
    isLive: Boolean(source.isLive),
    isSubscribable: Boolean(source.isSubscribable ?? source.isLive),
    subscriberCount: Number(source.subscriberCount || 0),
  }));
  const recentUpdates = await listRecentPublicUpdates(6);
  const digestPreview = recentUpdates.slice(0, 2);
  const digestSourceCount = new Set(digestPreview.map((update) => update.sourceName)).size;
  const activeSubscribers = sources.reduce((sum, source) => sum + source.subscriberCount, 0);
  const activeCategories = new Set(sources.map((source) => source.category)).size;
  const liveSourceCount = sources.filter((source) => source.isLive).length;

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageStructuredData) }}
      />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[46rem] bg-[radial-gradient(circle_at_14%_18%,rgba(16,185,129,0.2),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(15,23,42,0.12),transparent_26%),linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(255,255,255,0.9)_42%,rgba(255,255,255,0)_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-14 lg:grid-cols-[1.06fr_0.94fr] lg:items-start lg:pt-20">
          <div className="space-y-8 lg:pt-4">
            <div className="inline-flex rounded-full border border-emerald-200/90 bg-emerald-50/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              English-first monitoring for public compliance workflows
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-500">Built for tax, regulatory, and compliance teams</p>
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 md:text-[4.9rem] md:leading-[0.92]">
                  Stop chasing public updates across tabs, inboxes, and handoffs.
                </h1>
              </div>
              <p className="max-w-2xl text-xl leading-9 text-slate-600">
                UpdateBeam turns the public sources your team already watches into one verified daily briefing, delivered at the subscriber-local time that actually matches the workday.
              </p>
              <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <div className="border-l border-slate-300 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">What changes</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    Instead of checking the same websites every morning, your team starts from one brief that is already filtered, grouped, and ready to forward.
                  </p>
                </div>
                <div className="border-l border-slate-300 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Why it works</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    Subscribers set their own timezone and send time, so the digest arrives when the work starts, not when the system feels like sending it.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/sources#subscribe-panel"
                className="inline-flex h-12 items-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Start a free subscription
              </Link>
              <Link
                href="/sources"
                className="inline-flex h-12 items-center rounded-full border border-slate-300 px-6 text-sm font-medium text-slate-900 transition hover:border-slate-950"
              >
                Browse sources
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex h-12 items-center rounded-full border border-transparent px-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
              >
                See how it works
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="font-medium text-slate-950">Double opt-in</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-flex" />
              <span>Subscriber-set local delivery time</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-flex" />
              <span>One combined digest per day</span>
            </div>

            <div className="overflow-hidden rounded-[1.9rem] border border-slate-200/70 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#ecfdf5_100%)] shadow-[0_24px_70px_-48px_rgba(15,23,42,0.45)] backdrop-blur-sm">
              <div className="grid gap-0 divide-y divide-slate-200/80 md:grid-cols-4 md:divide-x md:divide-y-0">
                <div className="space-y-1 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sources live</p>
                  <p className="text-2xl font-semibold text-slate-950">{liveSourceCount}</p>
                  <p className="text-sm leading-6 text-slate-600">Curated public sources already producing updates</p>
                </div>
                <div className="space-y-1 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Categories</p>
                  <p className="text-2xl font-semibold text-slate-950">{activeCategories}</p>
                  <p className="text-sm leading-6 text-slate-600">Tax, regulatory, government, and more</p>
                </div>
                <div className="space-y-1 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subscriptions</p>
                  <p className="text-2xl font-semibold text-slate-950">{activeSubscribers}</p>
                  <p className="text-sm leading-6 text-slate-600">Signals already routed to inboxes</p>
                </div>
                <div className="space-y-1 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery</p>
                  <p className="text-xl font-semibold text-slate-950">1 digest / day</p>
                  <p className="text-sm leading-6 text-slate-600">Sent at each subscriber’s chosen local time</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative lg:pt-2">
            <div className="pointer-events-none absolute inset-x-8 top-10 h-28 rounded-full bg-emerald-500/16 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.4rem] border border-slate-200/80 bg-white shadow-[0_34px_100px_-48px_rgba(15,23,42,0.62)]">
              <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,#f8fafc_0%,#f0fdf4_100%)] px-6 py-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Start free</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Set up the digest in under two minutes</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Choose the public sources you want, set the local delivery time for that subscriber, and confirm once by email.
                </p>
              </div>
              <div className="p-5">
                <MarketingErrorBoundary
                  title="The subscription form could not finish rendering."
                  description="The rest of the page is still available. Reload once or open the source catalog if you need to continue."
                >
                  <SubscribeForm
                    sources={sources.map((source) => ({
                      id: source.id,
                      slug: source.slug,
                      name: source.name,
                      description: source.description,
                      category: source.category,
                      sourceTier: source.sourceTier,
                      trustLabel: source.trustLabel,
                      readinessLabel: source.readinessLabel,
                      isLive: source.isLive,
                      isSubscribable: source.isSubscribable,
                    }))}
                  />
                </MarketingErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Why teams switch</p>
            <h2 className="max-w-lg text-3xl font-semibold text-slate-950">From scattered source checking to a briefing your team can run on</h2>
            <p className="max-w-lg text-sm leading-7 text-slate-600">
              Instead of reopening the same sites every morning, teams get a single digest that is already grouped, filtered, and aligned to their working time.
            </p>
          </div>

          <div className="space-y-3 rounded-[2rem] border border-slate-200/80 bg-white/70 p-2 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.26)] backdrop-blur-sm">
            <div className="divide-y divide-slate-200/80 rounded-[1.6rem] bg-white/90">
              {[
                {
                  title: "Stop refreshing source pages",
                  description:
                    "Analysts and ops teams no longer need to keep browser tabs open for every public source they care about.",
                },
                {
                  title: "Keep one digest per subscriber",
                  description:
                    "Multiple subscribed sources are merged into a single email so internal forwarding and triage stay simple.",
                },
                {
                  title: "Match local working hours",
                  description:
                    "Every subscriber can set the local delivery time that fits their market, team handoff, or reporting rhythm.",
                },
                {
                  title: "Scale coverage through requests",
                  description:
                    "When the current source catalog is not enough, teams can request additional public sites from inside the product.",
                },
              ].map((item) => (
                <div key={item.title} className="grid gap-4 px-6 py-5 md:grid-cols-[56px_200px_1fr] md:items-start">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {String(
                      [
                        "Stop refreshing source pages",
                        "Keep one digest per subscriber",
                        "Match local working hours",
                        "Scale coverage through requests",
                      ].indexOf(item.title) + 1,
                    ).padStart(2, "0")}
                  </p>
                  <p className="text-sm font-medium tracking-tight text-slate-950">{item.title}</p>
                  <p className="text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="rounded-[1.6rem] bg-slate-950 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Best fit</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Tax operations</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Compliance teams</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Research monitoring</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">Regional reporting</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white md:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Example digest</p>
              <h2 className="mt-3 text-3xl font-semibold">What lands in the inbox</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                A single daily email with verified changes, grouped by source, tagged by content type, and delivered at the subscriber’s chosen local time.
              </p>
              <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-200">
                <p className="font-semibold text-white">UpdateBeam Daily Digest</p>
                <p className="mt-3 text-slate-300">Summary</p>
                <p>
                  {digestPreview.length
                    ? `We found ${digestPreview.length} verified update${digestPreview.length === 1 ? "" : "s"} yesterday across ${digestSourceCount || 1} subscribed source${digestSourceCount === 1 ? "" : "s"}.`
                    : "We publish selected updates only when there is enough reporting value to surface."}
                </p>
                <div className="mt-5 space-y-4">
                  {digestPreview.length ? (
                    digestPreview.map((update) => (
                      <div key={`${update.sourceSlug}-${update.slug}`}>
                        <p className="text-slate-300">{update.sourceName}</p>
                        <p>
                          [{update.label}] {update.title}
                        </p>
                        <p className="text-slate-400">{update.summary || "Selected public update with official source link."}</p>
                      </div>
                    ))
                  ) : (
                    <div>
                      <p className="text-slate-300">Selected public updates</p>
                      <p>Recent source-matched updates will appear here once the source catalog has live records.</p>
                      <p className="text-slate-400">This section stays selective so it never turns into a thin archive mirror.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Noise removed</p>
                  <p className="mt-2 text-sm text-white">No nav pages, image blobs, or obvious junk.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Team ready</p>
                  <p className="mt-2 text-sm text-white">One digest you can forward, archive, or turn into action.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Self-serve</p>
                  <p className="mt-2 text-sm text-white">Subscribers update time, timezone, and sources without a login.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.3)]">
            <div className="p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Supported sources</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Current monitored coverage</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Start with the public sources already available today, then expand coverage through source requests as your team’s monitoring map grows.
              </p>
              <div className="mt-6 divide-y divide-slate-200 rounded-[1.5rem] border border-slate-200 bg-slate-50/70">
              {sources.map((source) => (
                <div key={source.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-950">{source.name}</p>
                    <p className="text-sm text-slate-600">{source.description || source.rootUrl}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm shadow-slate-200/40">
                      {source.sourceTierLabel}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${source.isLive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {source.readinessLabel}
                    </span>
                  </div>
                </div>
              ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/sources"
                  className="inline-flex h-12 items-center rounded-full border border-slate-300 px-6 text-sm font-medium text-slate-950 transition hover:border-slate-950"
                >
                  Browse all sources
                </Link>
                {sources[0] ? (
                  <Link
                    href={`/sources/${sources[0].slug}`}
                    className="inline-flex h-12 items-center rounded-full border border-slate-300 px-6 text-sm font-medium text-slate-950 transition hover:border-slate-950"
                  >
                    Open source profile
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="border-t border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ecfdf5_100%)] px-8 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Why this matters for SEO</p>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-700">
                Source profiles, selected updates, and use-case pages create durable public entry points for search without turning every private daily email into thin archive content.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/updates"
                  className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Browse selected updates
                </Link>
                <Link
                  href="/use-cases"
                  className="inline-flex h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-medium text-slate-950 transition hover:border-slate-950"
                >
                  Explore use cases
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selective public archive</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">Publish the pages worth indexing, not every daily email</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              UpdateBeam keeps daily digests private and only publishes a small set of selected update pages when the public change is specific enough to stand on its own.
            </p>
            <div className="mt-6 space-y-4">
              {recentUpdates.length ? recentUpdates.map((update) => (
                <div key={update.slug} className="flex flex-col gap-2 border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] text-slate-700">
                      {update.label}
                    </span>
                    <span>{update.date}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-950">{update.title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{update.summary}</p>
                  <Link
                    href={`/updates/${update.sourceSlug}/${update.slug}`}
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Read selected update
                  </Link>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                  No public updates have been selected yet. Once a source publishes a meaningful prior-day change, it will appear here as a searchable reference page.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-lg shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Use cases</p>
            <h2 className="mt-3 text-3xl font-semibold">See how teams actually put the digest to work</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Public monitoring is only useful when it fits real reporting and triage workflows. These pages show the operating model behind the product.
            </p>
            <div className="mt-6 space-y-4">
              {publicUseCasePages.map((useCase) => (
                <div key={useCase.slug} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    {useCase.audience}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{useCase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{useCase.summary}</p>
                  <Link
                    href={`/use-cases/${useCase.slug}`}
                    className="mt-3 inline-flex text-sm font-medium text-white hover:text-emerald-200"
                  >
                    Explore use case
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-4 pt-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">FAQ</p>
            <h2 className="max-w-lg text-3xl font-semibold text-slate-950">Built for signal, not noise</h2>
            <p className="max-w-md text-sm leading-7 text-slate-600">
              The product stays lightweight on purpose: no login, one digest per subscriber, and a selective public archive instead of endless low-value daily pages.
            </p>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/88 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.32)] backdrop-blur-sm">
            <div className="divide-y divide-slate-200/80">
              {faqItems.map((item) => (
                <div key={item.question} className="grid gap-3 px-6 py-5 md:grid-cols-[220px_1fr] md:items-start">
                  <p className="text-sm font-medium tracking-tight text-slate-950">{item.question}</p>
                  <p className="text-sm leading-7 text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="overflow-hidden rounded-[2.6rem] border border-slate-200 bg-[linear-gradient(135deg,#020617_0%,#0f172a_46%,#0b3b33_100%)] px-8 py-10 text-white shadow-[0_30px_100px_-48px_rgba(2,6,23,0.8)] md:px-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Ready to stop manual monitoring?</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Start with the sources you already care about, then let each subscriber choose the right delivery time.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                No account required. Just email, confirm, and start receiving one verified digest per day.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/sources#subscribe-panel"
                className="inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
              >
                Start free
              </Link>
              <Link
                href="/request-a-source"
                className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
              >
                Request a source
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
