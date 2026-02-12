import Link from "next/link";
import PageScaffold from "@/components/PageScaffold";
import { getAuthSession } from "@/lib/auth/get-session";
import { listItinerariesService } from "@/modules/itineraries/itinerary.service";
import { itineraryTitle, parseGeneratedItinerary } from "@/modules/itineraries/presenter";

export default async function ItinerariesPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return (
      <PageScaffold
        title="My Itineraries"
        description="Access saved itineraries and continue trip planning."
      >
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="mb-4">Sign in to view your itineraries.</p>
          <Link
            href="/api/auth/signin"
            className="inline-flex rounded-full bg-[#0071eb] px-5 py-2 font-semibold text-white"
          >
            Sign In
          </Link>
        </div>
      </PageScaffold>
    );
  }

  const page = await listItinerariesService(session.user.id, undefined, 50);

  return (
    <PageScaffold
      title="My Itineraries"
      description="Your saved plans with quick access to detail and editing."
    >
      {page.data.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="mb-3">No itineraries saved yet.</p>
          <Link href="/planner" className="inline-flex rounded-full bg-[#0071eb] px-5 py-2 font-semibold text-white">
            Generate First Itinerary
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {page.data.map((item) => {
            const parsed = parseGeneratedItinerary(item.generatedPlan);
            return (
              <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="font-semibold">{itineraryTitle(item.generatedPlan, "Turkey trip")}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Status: {item.status} • Updated: {new Date(item.updatedAt).toLocaleString()}
                </p>
                {parsed ? (
                  <p className="mt-2 text-sm text-gray-700">
                    {parsed.days.length} days • {parsed.cityOrder.join(" -> ")} • {parsed.totalEstimatedCostTRY} TRY
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-700">Stored itinerary data available.</p>
                )}
                <div className="mt-4">
                  <Link
                    href={`/itineraries/${item.id}`}
                    className="inline-flex rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    Open Detail
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageScaffold>
  );
}
