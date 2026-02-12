import Link from "next/link";
import PageScaffold from "@/components/PageScaffold";
import { getAuthSession } from "@/lib/auth/get-session";
import { itineraryTitle, parseGeneratedItinerary } from "@/modules/itineraries/presenter";
import { listItinerariesService } from "@/modules/itineraries/itinerary.service";

export default async function DashboardPage() {
  const session = await getAuthSession();

  return (
    <PageScaffold title="Dashboard" description="Review and manage your saved itineraries.">
      {!session?.user?.id ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="mb-4">Sign in to view your saved trips.</p>
          <Link
            className="inline-flex items-center rounded-full bg-[#0071eb] px-5 py-2 text-white font-semibold"
            href="/api/auth/signin"
          >
            Sign In
          </Link>
        </div>
      ) : (
        <DashboardList userId={session.user.id} />
      )}
    </PageScaffold>
  );
}

async function DashboardList({ userId }: { userId: string }) {
  const page = await listItinerariesService(userId, undefined, 20);

  if (page.data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
        <p>No saved itineraries yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {page.data.map((itinerary) => {
        const parsed = parseGeneratedItinerary(itinerary.generatedPlan);
        return (
          <article key={itinerary.id} className="rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold mb-2">{itineraryTitle(itinerary.generatedPlan, "Trip")}</h2>
            <p className="text-sm text-gray-500 mb-2">
              Status: {itinerary.status} • Updated: {new Date(itinerary.updatedAt).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{itinerary.notes || "No notes"}</p>
            {parsed ? (
              <p className="text-xs text-gray-500 mb-3">
                {parsed.days.length} days • {parsed.totalEstimatedCostTRY} TRY
              </p>
            ) : null}
            <Link
              href={`/itineraries/${itinerary.id}`}
              className="inline-flex items-center rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Open itinerary
            </Link>
          </article>
        );
      })}
    </div>
  );
}
