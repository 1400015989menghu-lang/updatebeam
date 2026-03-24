"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clearEnglishValidationMessage, setEnglishValidationMessage } from "@/lib/public-form-validation";

export function FeedbackForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Feedback submission failed.");
      }
      setStatus("success");
      setMessage("Thanks. Your feedback has been added to our product queue.");
      event.currentTarget.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Feedback submission failed.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/20">
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <p className="font-medium text-slate-950">We read this for product and coverage decisions</p>
        <p className="mt-2">
          Share what feels noisy, what your team still checks manually, or what would make the digest more useful inside a real workflow.
        </p>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800">Feedback type</label>
        <select
          name="type"
          defaultValue="general"
          className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900"
        >
          <option value="general">General feedback</option>
          <option value="feature-request">Feature request</option>
          <option value="source-gap">Missing source / coverage gap</option>
          <option value="quality-issue">Digest quality issue</option>
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800">Message</label>
        <Textarea
          name="message"
          required
          rows={6}
          placeholder="Tell us what would make the product more useful."
          className="rounded-2xl"
          onInvalid={(event) => setEnglishValidationMessage(event, "Message")}
          onInput={clearEnglishValidationMessage}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800">Email (optional)</label>
        <Input
          name="email"
          type="email"
          placeholder="you@example.com"
          className="h-12 rounded-2xl"
          onInvalid={(event) => setEnglishValidationMessage(event, "Email")}
          onInput={clearEnglishValidationMessage}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-800">Page URL (optional)</label>
        <Input name="page" placeholder="https://updatebeam.com/sources" className="h-12 rounded-2xl" />
      </div>
      <Button type="submit" className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800">
        {status === "loading" ? "Submitting..." : "Send feedback"}
      </Button>
      {message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm ${status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {message}
        </div>
      ) : null}
      {status === "success" ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          <p className="font-medium text-slate-950">Need something concrete right now?</p>
          <p className="mt-2">
            You can keep exploring the current source catalog or submit a source request for a site your team still monitors manually.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/sources" className="font-medium text-emerald-700 hover:text-emerald-800">
              Browse sources
            </Link>
            <Link href="/request-a-source" className="font-medium text-emerald-700 hover:text-emerald-800">
              Request a source
            </Link>
          </div>
        </div>
      ) : null}
    </form>
  );
}
