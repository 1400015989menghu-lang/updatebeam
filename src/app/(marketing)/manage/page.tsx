import Link from "next/link";
import { PublicShell } from "@/components/marketing/public-shell";
import { ManageSubscriptionForm } from "@/components/marketing/manage-subscription-form";
import { buildMetadata } from "@/lib/seo";
import { getManageSession } from "@/lib/monitoring-service";

export const metadata = buildMetadata({
  title: "Manage subscription",
  description: "Update your UpdateBeam sources, timezone, and daily digest delivery time.",
  path: "/manage",
});

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await getManageSession({ token }) : { status: "invalid" as const };

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-5xl justify-center px-6 py-20">
        {result.status === "success" ? (
          <ManageSubscriptionForm
            token={result.token}
            unsubscribeToken={result.unsubscribeToken}
            email={result.subscriber.email}
            timezone={result.subscriber.timezone}
            preferredSendHour={result.subscriber.preferredSendHour}
            preferredSendMinute={result.subscriber.preferredSendMinute}
            activeSourceIds={result.subscriber.activeSourceIds}
            sources={result.sources.map((source) => ({
              id: source.id,
              slug: source.slug,
              name: source.name,
              description: source.description,
              category: source.category,
              sourceTier: source.sourceTier,
              trustLabel: source.trustLabel,
              readinessLabel: source.readinessLabel,
              isLive: source.isLive,
              isSubscribable: source.isSubscribable,
            }))}
          />
        ) : (
          <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">
              Manage subscription
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              This management link is no longer valid
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Request a fresh confirmation email from the homepage if you need to update your sources or delivery time.
            </p>
            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left text-sm leading-6 text-slate-600">
              <p className="font-medium text-slate-950">What you can do with a valid manage link</p>
              <ul className="mt-3 space-y-2">
                <li>Change subscribed sources</li>
                <li>Update timezone and local delivery time</li>
                <li>Unsubscribe fully without an account</li>
              </ul>
            </div>
            <div className="mt-8">
              <Link href="/" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
                Return home
              </Link>
            </div>
          </div>
        )}
      </section>
    </PublicShell>
  );
}
