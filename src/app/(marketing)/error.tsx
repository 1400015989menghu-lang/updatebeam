"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Marketing route error", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(4,120,87,0.14),_transparent_36%),radial-gradient(circle_at_80%_0%,_rgba(15,23,42,0.07),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-6 py-24 text-slate-950">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-700">Rendering error</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          This page hit a runtime error before it could finish rendering.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          The failure has been isolated to the marketing route. Retry once, or continue from the source catalog while the broken state is cleared.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-12 items-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Retry page
          </button>
          <Link
            href="/sources"
            className="inline-flex h-12 items-center rounded-full border border-slate-300 px-6 text-sm font-medium text-slate-950 transition hover:border-slate-950"
          >
            Open source catalog
          </Link>
        </div>
      </div>
    </main>
  );
}
