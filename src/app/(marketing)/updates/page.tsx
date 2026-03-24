import Link from "next/link";
import { PublicShell } from "@/components/marketing/public-shell";
import { buildMetadata } from "@/lib/seo";
import {
  buildUpdatesIndexStructuredData,
  updatesIndexKeywords,
} from "@/lib/public-site";
import { listRecentPublicUpdates } from "@/lib/monitoring-service";

export const metadata = buildMetadata({
  title: "Selected public updates from monitored sources",
  description: "Browse the small set of verified public updates UpdateBeam makes available for search and reference.",
  path: "/updates",
  keywords: updatesIndexKeywords,
});

export default async function UpdatesIndexPage() {
  const updates = await listRecentPublicUpdates(48);
  const structuredData = buildUpdatesIndexStructuredData(updates);

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.84fr] lg:items-end">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-700">
              Public updates
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950">
              A curated archive of verified public changes, not a mirror of every email we send.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              UpdateBeam only publishes selected updates that have enough reporting value to stand on their own. Empty digests and routine daily messages stay private.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-lg shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Why this archive exists
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-200">
              Search engines and teams get a clean reference page for high-value changes, while subscribers still receive one private daily digest at their chosen local time.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/sources"
                className="inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
              >
                Browse sources
              </Link>
              <Link
                href="/sources#subscribe-panel"
                className="inline-flex h-11 items-center rounded-full border border-white/20 px-5 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
              >
                Start free subscription
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6">
          {updates.length ? (
            updates.map((update) => (
              <article
                key={`${update.sourceSlug}-${update.slug}`}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/20"
              >
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] text-slate-700">
                    {update.label}
                  </span>
                  <span>{update.date}</span>
                  <span>{update.sourceName}</span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                  {update.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {update.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/updates/${update.sourceSlug}/${update.slug}`}
                    className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 font-medium text-white transition hover:bg-slate-800"
                  >
                    Read update page
                  </Link>
                  <Link
                    href={`/sources/${update.sourceSlug}`}
                    className="inline-flex h-11 items-center rounded-full border border-slate-300 px-5 font-medium text-slate-950 transition hover:border-slate-950"
                  >
                    View source profile
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm leading-7 text-slate-600 shadow-lg shadow-slate-200/20">
              No selected public updates are published yet. Once sources begin producing public records, the strongest items will appear here instead of private digest mirrors.
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
