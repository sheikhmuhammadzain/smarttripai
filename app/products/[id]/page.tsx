import { notFound } from "next/navigation";
import Image from "next/image";
import AddToCartButton from "@/components/commerce/AddToCartButton";
import CurrencyAmount from "@/components/CurrencyAmount";
import PageScaffold from "@/components/PageScaffold";
import { getProductById } from "@/lib/data";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <PageScaffold title={product.title} description={product.summary}>
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <Image src={product.image} alt={product.title} width={1200} height={900} className="h-full w-full object-cover" />
        </div>

        <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">
            {product.location} | {product.category} | {product.duration}
          </p>
          <p className="text-2xl font-bold">
            <CurrencyAmount amount={product.price} baseCurrency={product.currency} /> per traveler
          </p>
          <p className="text-sm text-gray-700">
            Rated {product.rating} ({product.reviews} reviews)
          </p>
          <AddToCartButton productId={product.id} />
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Highlights</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
            {product.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">What&apos;s Included</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-700">
            {product.includes.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </article>
      </section>
    </PageScaffold>
  );
}
