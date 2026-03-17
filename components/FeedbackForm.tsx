"use client";

import { FormEvent, useState } from "react";

type FeedbackCategory = "ux" | "itinerary" | "assistant" | "realtime" | "other";

const fieldCls = "h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors";

export default function FeedbackForm() {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("ux");
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim() ? email.trim() : undefined,
          category,
          rating,
          message,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Could not send feedback");
      }

      setResult("Feedback submitted. Thank you.");
      setMessage("");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Feedback submission failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border-default bg-surface-base p-5">
      <h2 className="mb-4 text-lg font-semibold text-text-heading">Send Product Feedback</h2>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Email (optional)</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldCls}
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
            className={fieldCls}
          >
            <option value="ux">UX/UI</option>
            <option value="itinerary">Itinerary quality</option>
            <option value="assistant">AI assistant</option>
            <option value="realtime">Realtime travel data</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Rating: {rating}/5</span>
          <input
            type="range"
            min={1}
            max={5}
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="w-full accent-brand"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">Message</span>
          <textarea
            required
            minLength={10}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            className="w-full rounded-lg border border-border-default bg-surface-base p-3 text-sm text-text-primary outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
            placeholder="Tell us what worked well and what should be improved..."
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-70 transition-colors"
        >
          {sending ? "Sending..." : "Submit feedback"}
        </button>
        {result ? <p className="text-sm text-text-muted">{result}</p> : null}
      </div>
    </form>
  );
}
