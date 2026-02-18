import Link from "next/link";
import CurrencyAmount from "@/components/CurrencyAmount";
import PageScaffold from "@/components/PageScaffold";
import { listAttractionsService } from "@/modules/attractions/attraction.service";

interface SearchParams {
  city?: string;
  tags?: string;
}

export default async function AttractionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const city = params.city?.trim() || undefined;
  const tags = params.tags?.trim() || undefined;

  const page = await listAttractionsService({
    city,
    tags,
    limit: 24,
  });

  return (
    <PageScaffold
      title="Attractions"
      description="Curated attractions from Turkey content dataset with city and interest metadata."
    >
      <form className="mb-6 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-3" method="get">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase text-gray-600">City</span>
          <input
            name="city"
            defaultValue={city}
            placeholder="istanbul"
            className="h-10 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-blue-600"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase text-gray-600">Tags</span>
          <input
            name="tags"
            defaultValue={tags}
            placeholder="culture,history,food"
            className="h-10 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-blue-600"
          />
        </label>
        <button type="submit" className="md:col-span-3 w-fit rounded-full bg-brand px-5 py-2 font-semibold text-white">
          Apply Filters
        </button>
      </form>

      {page.data.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-gray-700">
          No attractions found for the selected filters.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {page.data.map((item) => (
            <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {item.city} | {item.avgDurationMin} min | <CurrencyAmount amount={item.ticketPriceRange?.min ?? 0} baseCurrency={item.ticketPriceRange?.currency ?? "TRY"} />-
                <CurrencyAmount amount={item.ticketPriceRange?.max ?? 0} baseCurrency={item.ticketPriceRange?.currency ?? "TRY"} />
              </p>
              <p className="mt-3 text-sm text-gray-700">{item.description}</p>
              <p className="mt-3 text-xs text-gray-500">Tags: {item.tags.join(", ")}</p>
            </article>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Link href="/planner" className="rounded-full border border-gray-300 px-5 py-2 font-semibold text-gray-700">
          Back to Planner
        </Link>
      </div>
    </PageScaffold>
  );
}
