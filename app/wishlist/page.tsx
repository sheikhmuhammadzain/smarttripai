import Link from "next/link";
import PageScaffold from "@/components/PageScaffold";

export default function WishlistPage() {
  return (
    <PageScaffold
      title="Wishlist"
      description="Save attractions and tours you want to revisit while planning your Turkey trip."
    >
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
        <p className="text-gray-700">No wishlist items yet.</p>
        <p className="mt-2 text-sm text-gray-600">
          Browse curated attractions and add favorites as you plan.
        </p>
        <Link
          href="/attractions"
          className="mt-4 inline-flex rounded-full bg-[#0071eb] px-5 py-2 font-semibold text-white"
        >
          Explore Attractions
        </Link>
      </div>
    </PageScaffold>
  );
}
