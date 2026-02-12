import Link from "next/link";
import PageScaffold from "@/components/PageScaffold";

export default function CartPage() {
  return (
    <PageScaffold
      title="Cart"
      description="Review selected tours and experiences before final booking."
    >
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
        <p className="text-gray-700">Your cart is currently empty.</p>
        <p className="mt-2 text-sm text-gray-600">
          Add activities from the planner or attractions page to build your trip.
        </p>
        <Link
          href="/planner"
          className="mt-4 inline-flex rounded-full bg-[#0071eb] px-5 py-2 font-semibold text-white"
        >
          Go to Planner
        </Link>
      </div>
    </PageScaffold>
  );
}
