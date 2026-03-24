"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clearEnglishValidationMessage, setEnglishValidationMessage } from "@/lib/public-form-validation";

export function SourceRequestForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/public/source-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Submission failed.");
      }
      setStatus("success");
      setMessage("Thanks. Your source request is in our review queue.");
      event.currentTarget.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Submission failed.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/20">
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <p className="font-medium text-slate-950">Best for teams that already know which public website matters next</p>
        <p className="mt-2">
          Submit one source request per website so we can review demand, scope the adapter, and prioritize implementation.
        </p>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800">Website name</label>
        <Input
          name="siteName"
          required
          placeholder="Example: HASiL Public Updates"
          className="h-12 rounded-2xl"
          onInvalid={(event) => setEnglishValidationMessage(event, "Website name")}
          onInput={clearEnglishValidationMessage}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800">Website URL</label>
        <Input
          name="siteUrl"
          type="url"
          required
          placeholder="https://example.gov.my"
          className="h-12 rounded-2xl"
          onInvalid={(event) => setEnglishValidationMessage(event, "Website URL")}
          onInput={clearEnglishValidationMessage}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800">What should we monitor?</label>
        <Textarea
          name="description"
          required
          rows={6}
          placeholder="Share the sections, page types, or update patterns that matter."
          className="rounded-2xl"
          onInvalid={(event) => setEnglishValidationMessage(event, "Monitoring details")}
          onInput={clearEnglishValidationMessage}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800">Contact email (optional)</label>
        <Input
          name="contactEmail"
          type="email"
          placeholder="you@example.com"
          className="h-12 rounded-2xl"
          onInvalid={(event) => setEnglishValidationMessage(event, "Contact email")}
          onInput={clearEnglishValidationMessage}
        />
      </div>
      <Button type="submit" className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800">
        {status === "loading" ? "Submitting..." : "Submit source request"}
      </Button>
      {message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm ${status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {message}
        </div>
      ) : null}
      {status === "success" ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <p className="font-medium text-slate-950">Want to start using UpdateBeam today?</p>
          <p className="mt-2">
            You can still subscribe to the currently supported source catalog while we review your request.
          </p>
          <Link href="/sources#subscribe-panel" className="mt-3 inline-block font-medium text-emerald-700 hover:text-emerald-800">
            Browse current sources
          </Link>
        </div>
      ) : null}
    </form>
  );
}
