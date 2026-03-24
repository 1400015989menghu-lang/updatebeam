import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/marketing/public-shell";
import { buildMetadata } from "@/lib/seo";
import {
  buildUseCaseStructuredData,
  getPublicUseCasePage,
  publicUseCasePages,
  useCasePageKeywords,
} from "@/lib/public-site";

export function generateStaticParams() {
  return publicUseCasePages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getPublicUseCasePage(slug);

  if (!page) {
    return buildMetadata({
      title: "Use case",
      description: "Practical public monitoring use case from UpdateBeam.",
      path: `/use-cases/${slug}`,
    });
  }

  return buildMetadata({
    title: page.title,
    description: page.summary,
    path: `/use-cases/${page.slug}`,
    keywords: [...useCasePageKeywords, page.audience, page.challenge],
  });
}

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getPublicUseCasePage(slug);

  if (!page) {
    notFound();
  }

  const structuredData = buildUseCaseStructuredData(page);

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1fr_0.38fr]">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-700">
              Use case
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950">
              {page.title}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              {page.summary}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Challenge
            </p>
            <p className="mt-3 text-base leading-8 text-slate-700">
              {page.challenge}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Suggested workflow
            </p>
            <ol className="mt-6 space-y-4">
              {page.workflow.map((step, index) => (
                <li key={step} className="flex gap-4">
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-7 text-slate-700">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-lg shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Why teams pick this workflow
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {page.proofPoints.map((point) => (
                <div key={point} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm leading-6 text-slate-200">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Recommended sources
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Start with the sources that already match this workflow
              </h2>
            </div>

            <ul className="space-y-3">
              {page.recommendedSources.map((source) => (
                <li
                  key={source}
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800"
                >
                  {source}
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Next step
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Subscribe to the source catalog, choose your delivery time, and receive one clean daily digest instead of many raw updates.
              </p>
            </div>

            <Link
              href={page.ctaLabel === "Browse sources" ? "/sources" : "/sources#subscribe-panel"}
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              {page.ctaLabel}
            </Link>
          </div>
        </aside>
      </section>
    </PublicShell>
  );
}
