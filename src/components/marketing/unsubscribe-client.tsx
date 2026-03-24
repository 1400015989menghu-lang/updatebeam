"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function UnsubscribeClient({ token }: { token: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleUnsubscribe() {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/public/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unsubscribe failed.");
      }
      setStatus("success");
      setMessage("You have been unsubscribed from this digest.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unsubscribe failed.");
    }
  }

  return (
    <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/20">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
        Manage subscription
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
        Unsubscribe from this digest
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-600">
        Use the secure unsubscribe token from your email to stop future daily briefings.
      </p>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left text-sm leading-6 text-slate-600">
        <p className="font-medium text-slate-950">Before you unsubscribe</p>
        <ul className="mt-3 space-y-2">
          <li>You can keep the subscription and simply change the delivery time later.</li>
          <li>You can also reduce noise by updating source selection from your manage link.</li>
          <li>Unsubscribing here stops future UpdateBeam digests for this subscription.</li>
        </ul>
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleUnsubscribe}
          disabled={!token || status === "loading"}
          className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
        >
          {status === "loading" ? "Processing..." : "Unsubscribe"}
        </Button>
      </div>

      {message ? (
        <div
          className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
            status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="mt-8">
        <Link href="/" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          Return home
        </Link>
      </div>
    </div>
  );
}
