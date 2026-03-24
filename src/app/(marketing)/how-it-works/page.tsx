import Link from "next/link";
import { PublicShell } from "@/components/marketing/public-shell";
import { buildMetadata } from "@/lib/seo";
import { howItWorksKeywords, howItWorksSteps, howItWorksStructuredData } from "@/lib/public-site";

export const metadata = buildMetadata({
  title: "How UpdateBeam works for public source monitoring",
  description: "Learn how daily source monitoring, double opt-in subscriptions, and verified team digests work.",
  path: "/how-it-works",
  keywords: howItWorksKeywords,
});

export default function HowItWorksPage() {
  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howItWorksStructuredData) }}
      />
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">How it works</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-950">From source change to inbox briefing</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          UpdateBeam is designed for teams who need visibility into public tax, regulatory, and government updates without manually revisiting the same websites every day.
        </p>

        <div className="mt-12 grid gap-6">
          {howItWorksSteps.map((step, index) => (
            <div key={step.title} className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/20">
              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white">
                  {index + 1}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">{step.title}</h2>
                  <p className="mt-3 text-base leading-7 text-slate-600">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-[2.25rem] border border-emerald-200 bg-emerald-50 px-8 py-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Next step</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Start with the sources your team already checks manually.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
                Choose the public websites you care about, set a local delivery time, and let UpdateBeam handle the repeat work.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/sources#subscribe-panel"
                className="inline-flex h-12 items-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Browse sources
              </Link>
              <Link
                href="/request-a-source"
                className="inline-flex h-12 items-center rounded-full border border-slate-300 px-6 text-sm font-medium text-slate-950 transition hover:border-slate-950"
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
