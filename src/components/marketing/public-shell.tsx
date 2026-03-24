import Link from "next/link";
import { siteDescription, siteName, publicNavItems } from "@/lib/public-site";

export function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(4,120,87,0.14),_transparent_36%),radial-gradient(circle_at_80%_0%,_rgba(15,23,42,0.07),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/72 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#059669_0%,#0f766e_100%)] text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(5,150,105,0.75)]">
              UB
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {siteName}
              </div>
              <div className="text-xs text-slate-500">Public monitoring digests</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            {publicNavItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-slate-950">
                {item.label}
              </Link>
            ))}
            <Link
              href="/sources#subscribe-panel"
              className="rounded-full bg-slate-950 px-5 py-3 font-medium text-white transition hover:bg-slate-800"
            >
              Start free
            </Link>
          </nav>
        </div>

        <div className="border-t border-slate-200/70 px-6 py-3 md:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto pb-1 text-sm text-slate-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {publicNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 transition hover:border-slate-950 hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/sources#subscribe-panel"
              className="whitespace-nowrap rounded-full bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-200/80 bg-white/94">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
          <div className="max-w-md space-y-4">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              {siteName}
            </div>
            <p className="text-sm leading-7 text-slate-600">{siteDescription}</p>
            <p className="max-w-sm text-xs uppercase tracking-[0.16em] text-emerald-700">
              Built for tax teams, compliance operations, and research workflows
            </p>
          </div>
          <div className="grid gap-8 text-sm sm:grid-cols-2 lg:col-span-2">
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Product</p>
              <Link href="/sources" className="block text-slate-600 hover:text-slate-950">Sources</Link>
              <Link href="/updates" className="block text-slate-600 hover:text-slate-950">Selected updates</Link>
              <Link href="/use-cases" className="block text-slate-600 hover:text-slate-950">Use cases</Link>
              <Link href="/how-it-works" className="block text-slate-600 hover:text-slate-950">How it works</Link>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Explore</p>
              <Link href="/request-a-source" className="block text-slate-600 hover:text-slate-950">Request a source</Link>
              <Link href="/feedback" className="block text-slate-600 hover:text-slate-950">Feedback</Link>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Company</p>
              <Link href="/privacy" className="block text-slate-600 hover:text-slate-950">Privacy</Link>
              <Link href="/terms" className="block text-slate-600 hover:text-slate-950">Terms</Link>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-slate-900">Start here</p>
              <Link href="/sources#subscribe-panel" className="block text-slate-600 hover:text-slate-950">Start free</Link>
              <Link href="/sources#source-browser" className="block text-slate-600 hover:text-slate-950">Browse source catalog</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
