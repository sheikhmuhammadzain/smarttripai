import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Star,
  Tag,
  Users,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Shield,
  Zap,
  Heart,
} from "lucide-react";
import AddToCartButton from "@/components/commerce/AddToCartButton";
import CurrencyAmount from "@/components/CurrencyAmount";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
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

  const related = products.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-surface-muted text-text-heading">
      <Header />

      {/* Breadcrumb */}
      <nav className="mx-auto max-w-[1200px] px-4 pt-6 md:px-6">
        <ol className="flex items-center gap-1.5 text-xs text-text-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-brand">
              Home
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li>
            <Link href="/" className="transition-colors hover:text-brand">
              Experiences
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="text-text-body font-medium truncate max-w-[200px]">
            {product.title}
          </li>
        </ol>
      </nav>

      <main className="mx-auto max-w-[1200px] px-4 pb-16 pt-4 md:px-6">
        {/* ─── Hero Section ───────────────────────────── */}
        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Image */}
          <div className="relative overflow-hidden rounded-2xl border border-border-soft bg-white">
            {product.badge && (
              <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                <Sparkles className="h-3 w-3" />
                {product.badge}
              </span>
            )}
            <Image
              src={product.image}
              alt={product.title}
              width={1200}
              height={900}
              className="aspect-[4/3] w-full object-cover"
              priority
            />
          </div>

          {/* Details Card */}
          <div className="flex flex-col rounded-2xl border border-border-soft bg-white">
            {/* Card Header */}
            <div className="border-b border-border-subtle px-6 pt-6 pb-5">
              <h1 className="text-xl font-bold leading-snug text-text-primary lg:text-2xl">
                {product.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {product.summary}
              </p>
            </div>

            {/* Metadata Chips */}
            <div className="flex flex-wrap gap-2 border-b border-border-subtle px-6 py-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-text-body">
                <MapPin className="h-3 w-3 text-text-muted" />
                {product.location}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-text-body">
                <Tag className="h-3 w-3 text-text-muted" />
                {product.category}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-text-body">
                <Clock className="h-3 w-3 text-text-muted" />
                {product.duration}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-brand-soft px-3 py-1 text-xs font-medium text-text-brand">
                <Star className="h-3 w-3" />
                {product.rating} ({product.reviews.toLocaleString()})
              </span>
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div className="flex flex-wrap gap-3 border-b border-border-subtle px-6 py-4">
                {product.features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-text-body"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    {feature}
                  </span>
                ))}
              </div>
            )}

            {/* Price + CTA */}
            <div className="mt-auto px-6 py-5">
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary">
                  <CurrencyAmount
                    amount={product.price}
                    baseCurrency={product.currency}
                  />
                </span>
                <span className="text-sm text-text-muted">/ person</span>
              </div>
              <AddToCartButton productId={product.id} />

              {product.bookedText && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
                  <Zap className="h-3 w-3 text-amber-500" />
                  {product.bookedText}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ─── Trust Bar ─────────────────────────────── */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              icon: Shield,
              label: "Free Cancellation",
              sub: "Up to 24h before",
            },
            { icon: Zap, label: "Instant Confirmation", sub: "No waiting" },
            {
              icon: Users,
              label: "Small Groups",
              sub: "Max 12 travelers",
            },
            { icon: Heart, label: "Highly Rated", sub: `${product.rating}/5 stars` },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 rounded-xl border border-border-soft bg-white px-4 py-3.5"
            >
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div>
                <p className="text-xs font-semibold text-text-primary">
                  {item.label}
                </p>
                <p className="text-[11px] text-text-muted">{item.sub}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ─── Highlights / Includes ─────────────────── */}
        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-border-soft bg-white px-6 py-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-text-primary">
              Experience Highlights
            </h2>
            <ul className="space-y-3">
              {product.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex items-start gap-2.5 text-sm text-text-body"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  {highlight}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-border-soft bg-white px-6 py-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-text-primary">
              What&apos;s Included
            </h2>
            <ul className="space-y-3">
              {product.includes.map((entry) => (
                <li
                  key={entry}
                  className="flex items-start gap-2.5 text-sm text-text-body"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {entry}
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* ─── Related Experiences ────────────────────── */}
        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-5 text-lg font-bold text-text-primary">
              You Might Also Like
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border-soft bg-white transition-colors hover:border-brand/30"
                >
                  <div className="relative overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={600}
                      height={400}
                      className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    {item.badge && (
                      <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-4 py-3.5">
                    <p className="text-[11px] font-medium text-text-muted">
                      {item.location} · {item.duration}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold leading-snug text-text-primary line-clamp-2 group-hover:text-brand transition-colors">
                      {item.title}
                    </h3>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Star className="h-3 w-3 text-amber-500" />
                        {item.rating} ({item.reviews.toLocaleString()})
                      </span>
                      <span className="text-sm font-bold text-text-primary">
                        <CurrencyAmount
                          amount={item.price}
                          baseCurrency={item.currency}
                        />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
