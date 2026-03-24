import Link from "next/link";
import { PublicShell } from "@/components/marketing/public-shell";
import { FeedbackForm } from "@/components/marketing/feedback-form";
import { buildMetadata } from "@/lib/seo";
import { feedbackPageKeywords, feedbackStructuredData } from "@/lib/public-site";

export const metadata = buildMetadata({
  title: "Product feedback for public monitoring workflows",
  description: "Share feedback, source gaps, and feature requests for UpdateBeam public monitoring digests.",
  path: "/feedback",
  keywords: feedbackPageKeywords,
});

export default function FeedbackPage() {
  return (
    <PublicShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(feedbackStructuredData) }}
      />
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Feedback</p>
          <h1 className="text-5xl font-semibold tracking-tight text-slate-950">Help shape the next iteration of the product.</h1>
          <p className="text-lg leading-8 text-slate-600">
            We use feedback to tune digest quality, identify missing sites, and decide which improvements to build next.
          </p>
          <div className="grid gap-4 pt-3">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/20">
              <p className="text-sm font-semibold text-slate-950">Most useful feedback</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>Missing source categories or countries</li>
                <li>Digest quality problems such as noisy pages or missed updates</li>
                <li>Workflow requests that would help your team act faster</li>
              </ul>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/20">
              <p className="text-sm font-semibold text-slate-950">What we do with it</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <li>Digest quality issues inform adapter tuning</li>
                <li>Feature requests shape product iterations</li>
                <li>Coverage gaps influence source roadmap priorities</li>
              </ul>
            </div>
            <Link href="/sources" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
              Browse monitored sources first
            </Link>
          </div>
        </div>
        <FeedbackForm />
      </section>
    </PublicShell>
  );
}
