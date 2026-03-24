import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/marketing/public-shell";
import { sourceGroupLabel } from "@/lib/monitoring";
import { getPublicUpdatePageData } from "@/lib/monitoring-service";
import { buildUpdateStructuredData, updatePageKeywords } from "@/lib/public-site";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sourceSlug: string; updateSlug: string }>;
}) {
  const { sourceSlug, updateSlug } = await params;
  const page = await getPublicUpdatePageData(sourceSlug, updateSlug);

  if (!page) {
    return buildMetadata({
      title: "Public update",
      description: "Selected public update published by UpdateBeam.",
      path: `/updates/${sourceSlug}/${updateSlug}`,
    });
  }

  return buildMetadata({
    title: page.title,
    description: page.summary,
    path: `/updates/${page.sourceSlug}/${page.slug}`,
    keywords: [...updatePageKeywords, page.label, page.sourceName],
  });
}

export default async function PublicUpdatePage({
  params,
}: {
  params: Promise<{ sourceSlug: string; updateSlug: string }>;
}) {
  const { sourceSlug, updateSlug } = await params;
  const page = await getPublicUpdatePageData(sourceSlug, updateSlug);

  if (!page) {
    notFound();
  }

  const structuredData = buildUpdateStructuredData(page);
  const sourceProfileUrl = `/sources/${sourceSlug}`;

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <article className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1fr_0.34fr]">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.7rem] text-slate-700">
                {page.label}
              </span>
              <span>{page.date}</span>
              <span>{page.sourceName}</span>
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950">
              {page.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              {page.summary}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              What this page captures
            </p>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
              {page.bodyPoints.map((point) => (
                <p key={point}>{point}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-lg shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Why this stays selective
            </p>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-200">
              UpdateBeam only publishes a small number of keyword-matched public updates so teams can search, share, and cite meaningful changes without turning every daily digest into a thin archive page.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/updates"
                className="inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
              >
                Browse selected updates
              </Link>
              <Link
                href="/sources#subscribe-panel"
                className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
              >
                Start free subscription
              </Link>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Reference panel
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                One selected update with a direct path back to the source profile
              </h2>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Source profile
              </p>
              <p className="mt-2 font-medium text-slate-950">
                <Link href={sourceProfileUrl} className="hover:text-emerald-700">
                  {page.sourceName}
                </Link>
              </p>
              <p className="mt-2 text-slate-600">
                {sourceGroupLabel(page.sourceCategory)} • {page.sourceTimezone}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Official source
              </p>
              <a
                href={page.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block font-medium text-emerald-700 hover:text-emerald-800"
              >
                Open official public page
              </a>
            </div>

            {page.matchedKeywords.length ? (
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Matched keywords
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {page.matchedKeywords.map((item) => (
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

            {page.relatedUpdates.length ? (
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Related updates
                </p>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                  {page.relatedUpdates.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/updates/${sourceSlug}/${item.slug}`}
                        className="font-medium text-slate-950 hover:text-emerald-700"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Link
              href="/sources#subscribe-panel"
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Start free subscription
            </Link>
          </div>
        </aside>
      </article>
    </PublicShell>
  );
}
