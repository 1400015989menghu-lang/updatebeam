import Link from "next/link";
import { PublicShell } from "@/components/marketing/public-shell";
import { buildMetadata } from "@/lib/seo";
import {
  buildUseCasesIndexStructuredData,
  publicUseCasePages,
  useCasesIndexKeywords,
} from "@/lib/public-site";

export const metadata = buildMetadata({
  title: "Public monitoring use cases for teams",
  description: "See how tax, compliance, and regional teams use UpdateBeam to keep one verified daily digest in their workflow.",
  path: "/use-cases",
  keywords: useCasesIndexKeywords,
});

export default function UseCasesIndexPage() {
  const structuredData = buildUseCasesIndexStructuredData();

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.86fr] lg:items-end">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-700">
              Use cases
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950">
              Practical ways teams use one daily digest for public monitoring.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              These pages show how different teams fit UpdateBeam into their reporting, triage, and handoff workflows without adding another dashboard to monitor.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Built for
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-4 py-2">Tax teams</span>
              <span className="rounded-full bg-slate-100 px-4 py-2">Compliance operations</span>
              <span className="rounded-full bg-slate-100 px-4 py-2">Regional monitoring</span>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {publicUseCasePages.map((page) => (
            <article
              key={page.slug}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/20"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {page.audience}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {page.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {page.summary}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/use-cases/${page.slug}`}
                  className="inline-flex h-11 items-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Explore use case
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
