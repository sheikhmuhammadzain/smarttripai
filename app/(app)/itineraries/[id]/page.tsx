import Link from "next/link";
import ItineraryDetailClient from "@/components/ItineraryDetailClient";
import PageScaffold from "@/components/PageScaffold";
import { getAuthSession } from "@/lib/auth/get-session";
import { itineraryTitle, parseGeneratedItinerary } from "@/modules/itineraries/presenter";
import { getItineraryService } from "@/modules/itineraries/itinerary.service";

export default async function ItineraryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return (
      <PageScaffold title="Itinerary Detail" description="Sign in to manage your saved itinerary.">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="mb-4">You need to sign in to view this itinerary.</p>
          <Link href="/api/auth/signin" className="inline-flex rounded-full bg-[#0071eb] px-5 py-2 font-semibold text-white">
            Sign In
          </Link>
        </div>
      </PageScaffold>
    );
  }

  let itinerary: Awaited<ReturnType<typeof getItineraryService>> | null = null;
  try {
    itinerary = await getItineraryService(session.user.id, id);
  } catch {
    itinerary = null;
  }

  if (!itinerary) {
    return (
      <PageScaffold title="Itinerary Not Found" description="The requested itinerary could not be loaded.">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="mb-4">This itinerary does not exist or you do not have access.</p>
          <Link href="/dashboard" className="inline-flex rounded-full bg-[#0071eb] px-5 py-2 font-semibold text-white">
            Return to Dashboard
          </Link>
        </div>
      </PageScaffold>
    );
  }

  const generatedPlan = parseGeneratedItinerary(itinerary.generatedPlan);

  return (
    <PageScaffold
      title={itineraryTitle(itinerary.generatedPlan, "Itinerary detail")}
      description="Review daily plan, adjust notes, and manage itinerary status."
    >
      {generatedPlan ? (
        <section className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Plan Summary</h2>
          <p className="text-sm text-gray-700">
            {generatedPlan.days.length} days • {generatedPlan.cityOrder.join(" -> ")}
          </p>
          <p className="text-sm text-gray-700">Estimated total: {generatedPlan.totalEstimatedCostTRY} TRY</p>
          <div className="space-y-2">
            {generatedPlan.days.map((day) => (
              <div key={day.day} className="rounded-lg border border-gray-100 p-3">
                <p className="font-semibold">
                  Day {day.day}: {day.city}
                </p>
                <p className="text-sm text-gray-600">
                  {day.items.length} activities • {day.notes[0] ?? "No note"}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <ItineraryDetailClient itinerary={itinerary} generatedPlan={generatedPlan} />
    </PageScaffold>
  );
}
