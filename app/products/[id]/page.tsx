import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Star,
  CheckCircle2,
  ChevronRight,
  Shield,
  Zap,
  Users,
  Sparkles,
} from "lucide-react";
import CurrencyAmount from "@/components/CurrencyAmount";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductAvailabilityPanel from "@/components/product/ProductAvailabilityPanel";
import WishlistButton from "@/components/product/WishlistButton";
import { getProductById, products } from "@/lib/data";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  const related = products
    .filter((p) => p.id !== product.id && p.location === product.location)
    .slice(0, 3)
    .concat(products.filter((p) => p.id !== product.id && p.location !== product.location))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-surface-muted text-text-heading">
      <Header />

      {/* Breadcrumb */}
      <nav className="mx-auto max-w-300 px-4 pt-6 md:px-6">
        <ol className="flex items-center gap-1.5 text-xs text-text-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-brand">
              Home
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li>
            <Link href="/search" className="transition-colors hover:text-brand">
              Experiences
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="truncate max-w-55 font-medium text-text-body">
            {product.title}
          </li>
        </ol>
      </nav>

      <main className="mx-auto max-w-300 px-4 pb-20 pt-4 md:px-6">
        {/* Hero Image */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-border-soft bg-surface-subtle">
          {product.badge && (
            <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow">
              <Sparkles className="h-3 w-3" />
              {product.badge}
            </span>
          )}
          <Image
            src={product.image}
            alt={product.title}
            width={1200}
            height={540}
            className="w-full object-cover"
            style={{ maxHeight: "460px" }}
            priority
            unoptimized
          />
        </div>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Left column */}
          <div className="min-w-0">
            {/* Title block */}
            <div className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-brand" />
                  {product.location}
                </span>
                <span className="text-border-default">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-brand" />
                  {product.duration}
                </span>
                <span className="text-border-default">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {product.rating}
                  <span className="font-normal text-text-muted">
                    ({product.reviews.toLocaleString("en-US")} reviews)
                  </span>
                </span>
              </div>
              <h1 className="text-2xl font-bold leading-snug text-text-primary lg:text-3xl">
                {product.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {product.summary}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {product.bookedText && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                    <Zap className="h-3 w-3" />
                    {product.bookedText}
                  </div>
                )}
                <WishlistButton productId={product.id} productTitle={product.title} />
              </div>
            </div>

            {/* About this activity */}
            <section className="mb-6 rounded-2xl border border-border-soft bg-surface-base p-5">
              <h2 className="mb-4 text-base font-bold text-text-primary">
                About this activity
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Free cancellation</p>
                    <p className="text-xs text-text-muted">Cancel up to 24 hours in advance for a full refund</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Duration {product.duration}</p>
                    <p className="text-xs text-text-muted">Check availability to see starting times</p>
                  </div>
                </li>
                {product.features?.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <p className="text-sm font-semibold text-text-primary">{feature}</p>
                  </li>
                ))}
                <li className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Small groups</p>
                    <p className="text-xs text-text-muted">Personalised experience in a small group setting</p>
                  </div>
                </li>
              </ul>
            </section>

            {/* Highlights + Includes */}
            <section className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border-soft bg-surface-base px-5 py-4">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-primary">
                  Experience Highlights
                </h2>
                <ul className="space-y-2.5">
                  {product.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-text-body">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface-base px-5 py-4">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-primary">
                  What&apos;s Included
                </h2>
                <ul className="space-y-2.5">
                  {product.includes.map((inc) => (
                    <li key={inc} className="flex items-start gap-2 text-sm text-text-body">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Reviews */}
            {product.highlightedReviews && product.highlightedReviews.length > 0 && (
              <section className="mb-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-text-primary">
                    Highlighted reviews from other travelers
                  </h2>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-text-primary">{product.rating}</span>
                    <span className="ml-1 text-xs text-text-muted">({product.reviews.toLocaleString("en-US")})</span>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {product.highlightedReviews.map((review, i) => (
                    <article
                      key={i}
                      className="rounded-2xl border border-border-soft bg-surface-base p-5"
                    >
                      <div className="mb-3 flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s < review.rating ? "fill-amber-400 text-amber-400" : "fill-border-default text-border-default"}`}
                          />
                        ))}
                        <span className="ml-1 text-sm font-bold text-text-primary">{review.rating}</span>
                      </div>
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                          {review.reviewer.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {review.reviewer} — {review.country}
                          </p>
                          <p className="text-[11px] text-text-muted">
                            {review.date}
                            {review.verified && (
                              <span className="ml-1.5 text-emerald-500">· Verified booking</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-text-body">{review.text}</p>
                    </article>
                  ))}
                </div>
                <button type="button" className="mt-4 text-sm font-medium text-brand hover:underline">
                  See more reviews
                </button>
              </section>
            )}

            {/* Availability panel — mobile only (lg hides it here) */}
            <section className="mb-8 lg:hidden">
              <ProductAvailabilityPanel
                productId={product.id}
                basePrice={product.price}
                baseCurrency={product.currency}
              />
            </section>

            {/* Related products */}
            {related.length > 0 && (
              <section>
                <h2 className="mb-4 text-base font-bold text-text-primary">
                  You might also like
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {related.map((item) => (
                    <Link
                      key={item.id}
                      href={`/products/${item.id}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface-base transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="relative overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.title}
                          width={400}
                          height={270}
                          className="aspect-3/2 w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          unoptimized
                        />
                        {item.badge && (
                          <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold text-white">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-3.5">
                        <p className="text-[11px] text-text-muted">
                          {item.location} · {item.duration}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-text-primary group-hover:text-brand transition-colors">
                          {item.title}
                        </h3>
                        <div className="mt-auto flex items-center justify-between pt-2.5">
                          <span className="flex items-center gap-1 text-xs text-text-muted">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {item.rating}
                          </span>
                          <span className="text-sm font-bold text-text-heading">
                            <CurrencyAmount amount={item.price} baseCurrency={item.currency} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right: sticky availability sidebar — desktop only */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <ProductAvailabilityPanel
                productId={product.id}
                basePrice={product.price}
                baseCurrency={product.currency}
              />
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
