"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GeneratedItinerary } from "@/types/travel";

type ItineraryStatus = "draft" | "saved" | "archived";

interface ItineraryRecord {
  id: string;
  notes?: string;
  status: ItineraryStatus;
  version: number;
  updatedAt: string | Date;
}

interface ItineraryDetailClientProps {
  itinerary: ItineraryRecord;
  generatedPlan: GeneratedItinerary | null;
}

export default function ItineraryDetailClient({ itinerary, generatedPlan }: ItineraryDetailClientProps) {
  const [notes, setNotes] = useState(itinerary.notes ?? "");
  const [status, setStatus] = useState<ItineraryStatus>(itinerary.status);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dayCount = useMemo(() => generatedPlan?.days.length ?? 0, [generatedPlan]);

  async function updateItinerary() {
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/v1/itineraries/${itinerary.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          notes,
          status,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Failed to update itinerary");
      }

      setFeedback("Itinerary updated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to update itinerary");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteItinerary() {
    const approved = window.confirm("Delete this itinerary permanently?");
    if (!approved) {
      return;
    }

    setIsDeleting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/v1/itineraries/${itinerary.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        throw new Error(body.detail ?? "Failed to delete itinerary");
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Failed to delete itinerary");
      setIsDeleting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p>
          Status: <span className="font-semibold">{status}</span>
        </p>
        <p>
          Version: <span className="font-semibold">{itinerary.version}</span>
        </p>
        <p>
          Days: <span className="font-semibold">{dayCount}</span>
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 p-5">
        <h2 className="mb-4 text-lg font-semibold">Notes and Status</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ItineraryStatus)}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-blue-600"
            >
              <option value="draft">Draft</option>
              <option value="saved">Saved</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-600"
              placeholder="Add your travel notes..."
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            disabled={isSaving}
            onClick={() => void updateItinerary()}
            className="rounded-full bg-[#0071eb] px-5 py-2 font-semibold text-white disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            disabled={isDeleting}
            onClick={() => void deleteItinerary()}
            className="rounded-full border border-red-300 px-5 py-2 font-semibold text-red-700 disabled:opacity-70"
          >
            {isDeleting ? "Deleting..." : "Delete Itinerary"}
          </button>
          <Link href="/dashboard" className="rounded-full border border-gray-300 px-5 py-2 font-semibold text-gray-700">
            Back to Dashboard
          </Link>
        </div>

        {feedback ? <p className="mt-4 text-sm text-gray-700">{feedback}</p> : null}
      </div>
    </section>
  );
}
