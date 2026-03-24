import Link from "next/link";
import { PublicShell } from "@/components/marketing/public-shell";
import { buildMetadata } from "@/lib/seo";
import { confirmSubscriptionToken } from "@/lib/monitoring-service";
import { buildManageUrl } from "@/lib/monitoring";

export const metadata = buildMetadata({
  title: "Confirm subscription",
  description: "Confirm your UpdateBeam email subscription.",
  path: "/subscribe/confirm",
});

export default async function SubscribeConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await confirmSubscriptionToken(token) : { status: "invalid" as const };

  const messages = {
    success: {
      title: "Subscription confirmed",
      body: `You're now subscribed${"sourceNames" in result && result.sourceNames.length ? ` to ${result.sourceNames.join(", ")}` : ""}.`,
    },
    "already-confirmed": {
      title: "Already confirmed",
      body: "This subscription link has already been used.",
    },
    expired: {
      title: "Confirmation link expired",
      body: "Please subscribe again to receive a fresh confirmation email.",
    },
    invalid: {
      title: "Invalid confirmation link",
      body: "The link is missing or no longer valid.",
    },
  } as const;

  const message = messages[result.status];
  const manageUrl =
    "manageToken" in result && result.manageToken ? buildManageUrl(result.manageToken) : null;

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-3xl justify-center px-6 py-24">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Subscription status</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{message.title}</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{message.body}</p>
          {result.status === "success" ? (
            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left text-sm leading-6 text-slate-600">
              <p className="font-medium text-slate-950">What happens next</p>
              <ul className="mt-3 space-y-2">
                <li>Your digest will be sent once per day.</li>
                <li>All selected sources will be combined into one email.</li>
                <li>You can change sources or delivery time later from a secure manage link.</li>
              </ul>
            </div>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">
              Return home
            </Link>
            {manageUrl ? (
              <Link href={manageUrl} className="rounded-full border border-emerald-300 px-5 py-3 text-sm font-medium text-emerald-700 hover:border-emerald-500">
                Manage delivery time
              </Link>
            ) : null}
            <Link href="/sources" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-900 hover:border-slate-900">
              Browse sources
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
