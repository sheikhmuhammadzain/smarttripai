import Link from "next/link";
import AdminPanelClient from "@/components/admin/AdminPanelClient";
import {
  getAdminOverviewService,
  listAdminFeedbackService,
  listAdminItinerariesService,
  listAdminOrdersService,
  listAdminUsersService,
} from "@/modules/admin/admin.service";
import { requireAdmin } from "@/modules/auth/guards";

export default async function AdminPanelPage() {
  try {
    await requireAdmin();
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-subtle p-6 text-text-heading">
        <section className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-900">Admin Access Required</h1>
          <p className="mt-2 text-sm text-red-800">You do not have permission to open the admin workspace.</p>
          <div className="mt-5 flex gap-2">
            <Link href="/auth/signin" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
              Sign In
            </Link>
            <Link href="/" className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
              Home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [overview, users, orders, itineraries, feedback] = await Promise.all([
    getAdminOverviewService(),
    listAdminUsersService(undefined, 100),
    listAdminOrdersService(undefined, 100),
    listAdminItinerariesService(undefined, 100),
    listAdminFeedbackService(undefined, 100),
  ]);

  return (
    <main className="min-h-screen bg-surface-subtle text-text-heading">
      <AdminPanelClient
        overview={overview}
        users={users}
        orders={orders}
        itineraries={itineraries}
        feedback={feedback}
      />
    </main>
  );
}
