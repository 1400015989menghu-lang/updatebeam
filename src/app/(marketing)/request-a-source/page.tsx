import Link from "next/link";
import { PublicShell } from "@/components/marketing/public-shell";
import { SourceRequestForm } from "@/components/marketing/source-request-form";
import { buildMetadata } from "@/lib/seo";
import { requestSourceKeywords, requestSourceStructuredData } from "@/lib/public-site";

export const metadata = buildMetadata({
  title: "Request a new monitored public source",
  description: "Tell UpdateBeam which public website or source your team wants us to monitor next.",
  path: "/request-a-source",
  keywords: requestSourceKeywords,
});

export default function RequestSourcePage() {
  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(requestSourceStructuredData) }}
      />
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Request a source</p>
          <h1 className="text-5xl font-semibold tracking-tight text-slate-950">Tell us what website we should monitor next.</h1>
          <p className="text-lg leading-8 text-slate-600">
            We review incoming requests, look for repeat demand, and add new source adapters manually so coverage stays high-quality.
          </p>
          <div className="grid gap-4 pt-3">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/20">
              <p className="text-sm font-semibold text-slate-950">What makes a strong request</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>Name the official site and the exact section that changes</li>
                <li>Describe the update types your team actually cares about</li>
                <li>Explain why this source matters for compliance, tax, or monitoring work</li>
              </ul>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/20">
              <p className="text-sm font-semibold text-slate-950">What happens after submission</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>We review repeat demand and fit with the product</li>
                <li>High-signal requests move into adapter review</li>
                <li>Implemented sources become available on the Sources page</li>
              </ul>
            </div>
            <Link href="/sources" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              See currently supported sources
            </Link>
          </div>
        </div>
        <SourceRequestForm />
      </section>
    </PublicShell>
  );
}
