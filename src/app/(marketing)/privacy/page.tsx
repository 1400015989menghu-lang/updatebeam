import { PublicShell } from "@/components/marketing/public-shell";
import { buildMetadata } from "@/lib/seo";
import { legalPageKeywords } from "@/lib/public-site";

export const metadata = buildMetadata({
  title: "Privacy policy",
  description: "Privacy terms for UpdateBeam email subscriptions, source requests, and product feedback.",
  path: "/privacy",
  keywords: legalPageKeywords,
});

export default function PrivacyPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h1 className="text-5xl font-semibold tracking-tight text-slate-950">Privacy</h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-slate-600">
          <p>We collect only the information needed to run subscriptions, process source requests, and review feedback.</p>
          <p>Email addresses are used for confirmation messages, daily digests, and subscription management.</p>
          <p>Source requests and feedback may be reviewed by internal operators to improve coverage and product quality.</p>
        </div>
      </section>
    </PublicShell>
  );
}
