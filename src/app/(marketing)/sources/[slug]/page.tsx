import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/marketing/public-shell";
import { sourceGroupLabel } from "@/lib/monitoring";
import { getPublicSourcePageData } from "@/lib/monitoring-service";
import { buildSourceDetailStructuredData, sourceDetailKeywords, siteName } from "@/lib/public-site";
import { buildMetadata } from "@/lib/seo";

type PublicSourceDetailView = NonNullable<Awaited<ReturnType<typeof getPublicSourcePageData>>> & {
  sourceTier?: string;
  sourceTierLabel?: string;
  trustLabel?: string;
  sourceTypeLabel?: string;
  readinessLabel?: string;
  readinessDescription?: string;
  isLive?: boolean;
  isSubscribable?: boolean;
  ctaMode?: string;
  sourceType?: string;
  reviewMode?: string;
  reviewModeLabel?: string;
};

function startCase(value: string) {
  return value
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((item) => `${item.slice(0, 1).toUpperCase()}${item.slice(1)}`)
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublicSourcePageData(slug);

  if (!page) {
    return buildMetadata({
      title: "Source details",
      description: "Source details from UpdateBeam public monitoring digests.",
      path: `/sources/${slug}`,
    });
  }

  return buildMetadata({
    title: `${page.title} source profile`,
    description: page.summary,
    path: `/sources/${page.slug}`,
    keywords: [...sourceDetailKeywords, page.title, ...page.coverage],
  });
}

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sourcePage = (await getPublicSourcePageData(slug)) as PublicSourceDetailView | null;

  if (!sourcePage) {
    notFound();
  }

  const title = sourcePage.title || sourcePage.slug;
  const summary = sourcePage.summary || "Public source profile and selected update history.";
  const audience = Array.isArray(sourcePage.audience) ? sourcePage.audience.filter(Boolean) : [];
  const coverage = Array.isArray(sourcePage.coverage) ? sourcePage.coverage.filter(Boolean) : [];
  const digestHighlights = Array.isArray(sourcePage.digestHighlights) ? sourcePage.digestHighlights.filter(Boolean) : [];
  const includeKeywords = Array.isArray(sourcePage.includeKeywords) ? sourcePage.includeKeywords.filter(Boolean) : [];
  const updateEntries = Array.isArray(sourcePage.sampleUpdates) ? sourcePage.sampleUpdates : [];
  const publicUpdateCount = Number(sourcePage.publicUpdateCount || updateEntries.length || 0);
  const activeSubscriberCount = Number(sourcePage.activeSubscriberCount || 0);
  const officialUrl = sourcePage.officialUrl || sourcePage.rootUrl || "/sources";
  const timezone = sourcePage.timezone || "Asia/Kuala_Lumpur";
  const isLive = Boolean(sourcePage.isLive ?? publicUpdateCount > 0);
  const canSubscribe = Boolean(sourcePage.isSubscribable ?? isLive);
  const reviewMode = sourcePage.reviewMode ?? "automatic";
  const isReviewOnly = reviewMode === "review-only";
  const readinessLabel = sourcePage.readinessLabel ?? (isLive ? "Live now" : "Coming soon");
  const trustLabel = sourcePage.trustLabel ?? sourcePage.trustTier;
  const sourceTypeLabel = sourcePage.sourceTypeLabel ?? (sourcePage.sourceType ? startCase(sourcePage.sourceType) : startCase(sourcePage.adapterType));
  const sourceTierLabel = sourcePage.sourceTierLabel
    ?? (sourcePage.sourceTier ? startCase(sourcePage.sourceTier) : sourceGroupLabel(sourcePage.category));
  const readinessDescription = sourcePage.readinessDescription
    ?? (isLive
      ? "This source already has public updates available and can be included in a subscriber digest today."
      : "This source profile is visible now, but subscriber delivery will open after public updates have been captured.");
  const structuredData = buildSourceDetailStructuredData({
    slug: sourcePage.slug,
    title,
    summary,
    updates: updateEntries,
  });

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
                Source profile
              </p>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950">
                  {title}
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-slate-600">
                  {summary}
                </p>
                {!isLive ? (
                  <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
                    {readinessDescription}
                  </div>
                ) : null}
                {isReviewOnly ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm leading-6 text-slate-700">
                    <p className="font-medium text-slate-950">Why this source is review-only</p>
                    <p className="mt-2">
                      This source is already tracked inside the monitoring workflow, but anonymous access is not stable enough for unattended digest delivery.
                    </p>
                    <p className="mt-2">
                      UpdateBeam still keeps the source profile, official links, tracked keywords, and review queue context available here.
                    </p>
                    <p className="mt-2">
                      What you will not receive yet: automatic digest coverage or public sample updates from this source.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">
                {sourceTierLabel}
              </span>
              <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">
                {timezone}
              </span>
              <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">
                Trust: {trustLabel}
              </span>
              <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">
                Type: {sourceTypeLabel}
              </span>
              <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">
                Mode: {sourcePage.reviewModeLabel ?? (isReviewOnly ? "Manual review only" : "Automatic monitoring")}
              </span>
              <span className={`rounded-full px-4 py-2 shadow-sm shadow-slate-200/40 ${isLive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {readinessLabel}
              </span>
              <span className="rounded-full bg-white px-4 py-2 shadow-sm shadow-slate-200/40">
                {activeSubscriberCount} active subscribers
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/20">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Audience
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {(audience.length ? audience : ["Audience details will appear when this source profile is fully configured."]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/20">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Coverage
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {(coverage.length ? coverage : ["Coverage details will appear when live monitoring starts."]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/20">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {isLive ? "What the digest includes" : "What to expect when live"}
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {isLive ? (
                  (digestHighlights.length ? digestHighlights : [
                    "Verified public changes only",
                    "Grouped by source and label",
                    "Delivered through one daily digest",
                  ]).map((item) => (
                    <div key={item} className="border-l-2 border-emerald-500 pl-4">
                      <p className="text-sm leading-6 text-slate-700">{item}</p>
                    </div>
                  ))
                ) : isReviewOnly ? (
                  <>
                    <div className="border-l-2 border-amber-500 pl-4">
                      <p className="text-sm leading-6 text-slate-700">The source stays in the monitoring workflow, but current delivery still depends on manual review.</p>
                    </div>
                    <div className="border-l-2 border-amber-500 pl-4">
                      <p className="text-sm leading-6 text-slate-700">Official links, tracked keywords, and readiness context remain visible here for planning.</p>
                    </div>
                    <div className="border-l-2 border-amber-500 pl-4">
                      <p className="text-sm leading-6 text-slate-700">Automatic digest delivery and public sample updates are intentionally unavailable until this source becomes stable enough for unattended capture.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-l-2 border-amber-500 pl-4">
                      <p className="text-sm leading-6 text-slate-700">Live updates are not available yet, so there is no digest sample to preview.</p>
                    </div>
                    <div className="border-l-2 border-amber-500 pl-4">
                      <p className="text-sm leading-6 text-slate-700">The public profile stays visible for planning, review, and source request decisions.</p>
                    </div>
                    <div className="border-l-2 border-amber-500 pl-4">
                      <p className="text-sm leading-6 text-slate-700">Once updates start flowing, the live digest cards will appear here automatically.</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-lg shadow-slate-200/20">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                {isLive ? "Why this source matters" : "Why this source is listed"}
              </p>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">
                {isLive
                  ? `${siteName} turns a noisy public website into one verified daily digest so teams can keep a stable record of public changes without manually revisiting the same source every morning.`
                  : isReviewOnly
                    ? `${siteName} keeps this source visible because it still matters operationally, even though the current workflow depends on manual review instead of automatic digest delivery.`
                    : `${siteName} keeps this source visible in the catalog so teams can review trust, source type, and likely fit before live monitoring becomes available.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={canSubscribe ? "/sources#subscribe-panel" : isReviewOnly ? "/sources" : "/request-a-source"}
                  className="inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  {canSubscribe ? "Start free subscription" : isReviewOnly ? "View live sources" : "Request priority review"}
                </Link>
                <Link
                  href="/updates"
                  className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
                >
                  View selected updates
                </Link>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/20">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  At a glance
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {isLive
                    ? "A live source profile with recent selected updates and tracked keyword context"
                    : "A cataloged source profile with readiness context and tracked keyword guidance"}
                </h2>
              </div>

              <dl className="grid gap-4 text-sm">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Official source
                  </dt>
                  <dd className="mt-2 text-slate-700">
                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Open the public website
                    </a>
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Trust and type
                  </dt>
                  <dd className="mt-2 text-slate-700">
                    {trustLabel} • {sourceTypeLabel}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Readiness
                  </dt>
                  <dd className="mt-2 text-slate-700">
                    {isLive
                      ? `${publicUpdateCount} public update${publicUpdateCount === 1 ? "" : "s"} available for search and subscriber preview.`
                      : isReviewOnly
                        ? "This source is checked on schedule, but updates are held in manual review and do not appear in the public archive or subscription feed."
                        : "Public updates are not yet available for subscriber preview."}
                  </dd>
                </div>
              </dl>

              {includeKeywords.length ? (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Tracked keywords
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {includeKeywords.slice(0, 8).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Recommended next step
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {canSubscribe
                    ? "Subscribe to this source if your team wants prior-day keyword-matched updates in one daily digest at a local time of your choice."
                    : isReviewOnly
                      ? "This source remains visible for planning, trust review, and official-link lookup, but it is not part of the automatic digest yet."
                      : "This source is not live yet, so the best next step is to request coverage or browse the live sources that already deliver updates."}
                </p>
                <Link
                  href={canSubscribe ? "/sources#subscribe-panel" : isReviewOnly ? "/sources" : "/request-a-source"}
                  className="mt-4 inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {canSubscribe ? "Subscribe on the source catalog" : isReviewOnly ? "Browse live sources" : "Request priority review"}
                </Link>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Selected public updates
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                A curated sample of recent keyword-matched changes from this source
              </h2>
            </div>
            <Link href="/updates" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              Browse the public archive
            </Link>
          </div>
          <div className="mt-6 grid gap-4">
            {updateEntries.length ? (
              updateEntries.map((update) => (
                <article
                  key={update.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/20"
                >
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] text-slate-700">
                      {update.label}
                    </span>
                    <span>{update.date}</span>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                    {update.title}
                  </h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                    {update.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Link
                      href={`/updates/${slug}/${update.slug}`}
                      className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 font-medium text-white transition hover:bg-slate-800"
                    >
                      Read update page
                    </Link>
                    <a
                      href={update.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center rounded-full border border-slate-300 px-5 font-medium text-slate-950 transition hover:border-slate-950"
                    >
                      Open official source
                    </a>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-sm leading-7 text-slate-600 shadow-lg shadow-slate-200/20">
                {isLive
                  ? "No public selected updates have been published for this source yet. The source is still available to subscribers and can start publishing here once keyword-matched prior-day updates are captured."
                  : isReviewOnly
                    ? "This source is currently review-only, so public sample updates are intentionally hidden until the source can support stable automated delivery."
                    : "This source has not gone live yet, so there are no public selected updates to preview. Once updates start flowing, the sample cards will appear here."}
              </div>
            )}
          </div>
        </section>
      </section>
    </PublicShell>
  );
}
