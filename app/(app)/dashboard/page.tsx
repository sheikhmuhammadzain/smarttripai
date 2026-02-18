import Link from "next/link";
import { redirect } from "next/navigation";
import CurrencyAmount from "@/components/CurrencyAmount";
import PageScaffold from "@/components/PageScaffold";
import { getAuthSession } from "@/lib/auth/get-session";
import { isAdminSession } from "@/modules/auth/guards";
import { itineraryTitle, parseGeneratedItinerary } from "@/modules/itineraries/presenter";
import { listItinerariesService } from "@/modules/itineraries/itinerary.service";
import { listUserOrdersService } from "@/modules/orders/order.service";

export default async function DashboardPage() {
  let session: Awaited<ReturnType<typeof getAuthSession>> | null = null;
  let userId: string | undefined;
  let admin = false;
  let data: [Awaited<ReturnType<typeof listItinerariesService>>, Awaited<ReturnType<typeof listUserOrdersService>>] | null = null;
  let loadError = false;

  try {
    session = await getAuthSession();
    userId = session?.user?.id;
    admin = userId ? await isAdminSession() : false;

    if (admin) {
      redirect("/admin");
    }

    data = userId
      ? await Promise.all([
          listItinerariesService(userId, undefined, 20),
          listUserOrdersService(userId, undefined, 5),
        ])
      : null;
  } catch {
    loadError = true;
  }

  return (
    <PageScaffold title="Dashboard" description="Review and manage your saved itineraries.">
      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="mb-2 font-medium text-amber-900">Dashboard data could not be loaded.</p>
          <p className="text-sm text-amber-800">
            This usually means a server configuration issue in the deployed environment. Check deployment logs and database/auth environment variables.
          </p>
        </div>
      ) : !session?.user?.id ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="mb-4">Sign in to view your saved trips.</p>
          <Link
            className="inline-flex items-center rounded-full bg-brand px-5 py-2 text-white font-semibold"
            href="/auth/signin"
          >
            Sign In
          </Link>
        </div>
      ) : (
        <DashboardContent
          itineraries={data?.[0] ?? { data: [], nextCursor: null }}
          orders={data?.[1] ?? { data: [], nextCursor: null }}
          isAdmin={admin}
        />
      )}
    </PageScaffold>
  );
}

function DashboardContent({
  itineraries,
  orders,
  isAdmin,
}: {
  itineraries: Awaited<ReturnType<typeof listItinerariesService>>;
  orders: Awaited<ReturnType<typeof listUserOrdersService>>;
  isAdmin: boolean;
}) {
  if (itineraries.data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
        <p className="mb-3">No saved itineraries yet.</p>
        <Link href="/planner" className="inline-flex rounded-full bg-brand px-5 py-2 font-semibold text-white">
          Create itinerary
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/user" className="inline-flex rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
          Open User Panel
        </Link>
        {isAdmin ? (
          <Link href="/admin" className="inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white">
            Open Admin Panel
          </Link>
        ) : null}
      </div>

      {orders.data.length > 0 ? (
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold">Recent Orders</h2>
          <div className="space-y-2">
            {orders.data.map((order) => (
              <div key={order.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                <p className="font-medium">{order.orderCode}</p>
                <p className="text-gray-600">
                  <CurrencyAmount amount={order.total} baseCurrency={order.currency} /> | {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {itineraries.data.map((itinerary) => {
          const parsed = parseGeneratedItinerary(itinerary.generatedPlan);
          return (
            <article key={itinerary.id} className="rounded-xl border border-gray-200 p-5">
              <h2 className="mb-2 font-bold">{itineraryTitle(itinerary.generatedPlan, "Trip")}</h2>
              <p className="mb-2 text-sm text-gray-500">
                Status: {itinerary.status} | Updated: {new Date(itinerary.updatedAt).toLocaleString()}
              </p>
              <p className="mb-3 line-clamp-3 text-sm text-gray-600">{itinerary.notes || "No notes"}</p>
              {parsed ? (
                <p className="mb-3 text-xs text-gray-500">
                  {parsed.days.length} days | <CurrencyAmount amount={parsed.totalEstimatedCostTRY} baseCurrency="TRY" />
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
    </>
  );
}
