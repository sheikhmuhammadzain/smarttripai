import Link from "next/link";
import PageScaffold from "@/components/PageScaffold";
import UserAccountSettingsCard from "@/components/UserAccountSettingsCard";
import UserPreferencesCard from "@/components/UserPreferencesCard";
import { getAuthSession } from "@/lib/auth/get-session";
import { listItinerariesService } from "@/modules/itineraries/itinerary.service";
import { itineraryTitle } from "@/modules/itineraries/presenter";
import { listUserOrdersService } from "@/modules/orders/order.service";
import { getUserPreferencesService } from "@/modules/users/user-preference.service";
import { getUserService } from "@/modules/users/user.service";
import type { InterestTag } from "@/types/travel";

export default async function UserPanelPage() {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <PageScaffold title="User Panel" description="Sign in to access your dashboard and account activity.">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="mb-4">You are not authenticated.</p>
          <Link href="/auth/signin" className="inline-flex rounded-full bg-brand px-5 py-2 font-semibold text-white">
            Sign In
          </Link>
        </div>
      </PageScaffold>
    );
  }

  const [itineraries, orders, preferences, account] = await Promise.all([
    listItinerariesService(userId, undefined, 8),
    listUserOrdersService(userId, undefined, 8),
    getUserPreferencesService(userId),
    getUserService(userId),
  ]);

  return (
    <PageScaffold title="User Panel" description="Your account, saved itineraries, and booking activity.">
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Saved itineraries" value={String(itineraries.data.length)} />
        <StatCard label="Recent orders" value={String(orders.data.length)} />
        <StatCard label="Email" value={account.email ?? "N/A"} mono />
      </section>

      <UserAccountSettingsCard
        initial={{
          name: account.name ?? "",
          email: account.email ?? "",
          phone: account.phone ?? "",
        }}
      />

      <UserPreferencesCard
        initial={{
          preferredBudget: preferences.preferredBudget,
          preferredCities: preferences.preferredCities,
          preferredInterests: preferences.preferredInterests as InterestTag[],
        }}
      />

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Recent Itineraries</h2>
        {itineraries.data.length === 0 ? (
          <p className="text-sm text-gray-600">No itineraries saved yet.</p>
        ) : (
          <div className="space-y-3">
            {itineraries.data.map((item) => (
              <article key={item.id} className="rounded-lg border border-gray-100 p-3">
                <p className="font-medium">{itineraryTitle(item.generatedPlan, "Trip")}</p>
                <p className="text-xs text-gray-500">
                  Status: {item.status} | Updated: {new Date(item.updatedAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Recent Orders</h2>
        {orders.data.length === 0 ? (
          <p className="text-sm text-gray-600">No orders found.</p>
        ) : (
          <div className="space-y-3">
            {orders.data.map((order) => (
              <article key={order.id} className="rounded-lg border border-gray-100 p-3">
                <p className="font-medium">{order.orderCode}</p>
                <p className="text-xs text-gray-500">
                  {order.total} {order.currency} | {order.customer.email} | {new Date(order.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageScaffold>
  );
}

function StatCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
    </div>
  );
}
