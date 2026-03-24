export default function MarketingLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(4,120,87,0.12),_transparent_36%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-6 py-16 text-slate-950">
      <div className="mx-auto max-w-7xl animate-pulse space-y-8">
        <div className="h-14 w-44 rounded-full bg-white/80 shadow-sm" />
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="h-5 w-52 rounded-full bg-emerald-100" />
            <div className="h-16 w-full max-w-3xl rounded-[2rem] bg-slate-200" />
            <div className="h-16 w-full max-w-2xl rounded-[2rem] bg-slate-100" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="h-24 rounded-[1.75rem] bg-white" />
              <div className="h-24 rounded-[1.75rem] bg-white" />
              <div className="h-24 rounded-[1.75rem] bg-white" />
            </div>
          </div>
          <div className="rounded-[2.4rem] border border-slate-200 bg-white p-6 shadow-[0_34px_100px_-48px_rgba(15,23,42,0.25)]">
            <div className="h-7 w-40 rounded-full bg-emerald-100" />
            <div className="mt-4 h-10 w-full rounded-[1.5rem] bg-slate-100" />
            <div className="mt-6 space-y-3">
              <div className="h-16 rounded-[1.5rem] bg-slate-100" />
              <div className="h-16 rounded-[1.5rem] bg-slate-100" />
              <div className="h-16 rounded-[1.5rem] bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
