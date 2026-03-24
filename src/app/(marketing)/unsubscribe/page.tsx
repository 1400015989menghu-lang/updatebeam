import { PublicShell } from "@/components/marketing/public-shell";
import { UnsubscribeClient } from "@/components/marketing/unsubscribe-client";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Unsubscribe",
  description: "Unsubscribe from UpdateBeam daily briefings.",
  path: "/unsubscribe",
});

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <PublicShell>
      <section className="mx-auto flex max-w-3xl justify-center px-6 py-24">
        <UnsubscribeClient token={token || ""} />
      </section>
    </PublicShell>
  );
}
