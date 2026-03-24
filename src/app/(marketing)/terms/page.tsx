import { PublicShell } from "@/components/marketing/public-shell";
import { buildMetadata } from "@/lib/seo";
import { legalPageKeywords } from "@/lib/public-site";

export const metadata = buildMetadata({
  title: "Terms of use",
  description: "Terms for using UpdateBeam source monitoring subscriptions and public forms.",
  path: "/terms",
  keywords: legalPageKeywords,
});

export default function TermsPage() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h1 className="text-5xl font-semibold tracking-tight text-slate-950">Terms</h1>
        <div className="mt-8 space-y-6 text-base leading-8 text-slate-600">
          <p>UpdateBeam provides monitoring digests for public sources. Source content remains owned by the original publishers.</p>
          <p>We may change, pause, or remove monitored sources as coverage evolves. Availability is best-effort for v1.</p>
          <p>Users must not abuse public forms, submit unlawful content, or attempt to interfere with delivery systems.</p>
        </div>
      </section>
    </PublicShell>
  );
}
