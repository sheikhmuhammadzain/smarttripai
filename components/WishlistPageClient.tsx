"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Heart, MapPin, Clock, Star, Trash2, ShoppingCart, ArrowRight, Sparkles, ChevronDown } from "lucide-react";
import CurrencyAmount from "@/components/CurrencyAmount";
import { products } from "@/lib/data";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCartState } from "@/components/commerce/cart-client";

export default function WishlistPageClient() {
  const { items, isLoading, remove } = useWishlist();
  const { addItem } = useCartState();

  const PAGE_SIZE = 4;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const wishlistProducts = useMemo(
    () => products.filter((product) => items.includes(product.id)),
    [items],
  );

  const visibleProducts = wishlistProducts.slice(0, visibleCount);
  const hasMore = visibleCount < wishlistProducts.length;

  function removeItem(productId: string) {
    void remove(productId);
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-border-default bg-surface-base overflow-hidden">
            <div className="h-48 bg-surface-muted" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-surface-muted" />
              <div className="h-3 w-1/2 rounded bg-surface-muted" />
              <div className="h-3 w-full rounded bg-surface-muted" />
              <div className="h-8 w-1/3 rounded bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (wishlistProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-default bg-surface-muted/50 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-subtle">
          <Heart className="h-8 w-8 text-text-subtle" />
        </div>
        <h3 className="mb-1 text-lg font-semibold text-text-primary">Your wishlist is empty</h3>
        <p className="mb-6 max-w-xs text-sm text-text-muted">
          Browse our curated Turkey experiences and save the ones you love.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
          >
            <Sparkles className="h-4 w-4" /> Browse Experiences
          </Link>
          <Link
            href="/attractions"
            className="inline-flex items-center gap-2 rounded-full border border-border-default px-5 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-subtle transition-colors"
          >
            Explore Destinations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Count bar */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text-primary">{wishlistProducts.length}</span>{" "}
          saved experience{wishlistProducts.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((product) => (
          <article
            key={product.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-base shadow-sm hover:shadow-md hover:border-brand/20 transition-all"
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden bg-surface-muted">
              <Image
                src={product.image}
                alt={product.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {/* Badge */}
              {product.badge && (
                <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
                  {product.badge}
                </span>
              )}
              {/* Remove heart */}
              <button
                onClick={() => removeItem(product.id)}
                aria-label="Remove from wishlist"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow hover:bg-red-50 transition-colors"
              >
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              </button>
              {/* Category pill */}
              <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                {product.category}
              </span>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col p-4">
              <h2 className="mb-1.5 line-clamp-2 font-bold text-text-primary leading-snug">
                {product.title}
              </h2>

              <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {product.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {product.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {product.rating.toFixed(1)}
                </span>
              </div>

              <p className="mb-4 line-clamp-2 text-sm text-text-muted">{product.summary}</p>

              {/* Price + Actions */}
              <div className="mt-auto">
                <p className="mb-3 text-lg font-bold text-text-primary">
                  <CurrencyAmount amount={product.price} baseCurrency={product.currency} />
                  <span className="ml-1 text-xs font-normal text-text-muted">/ person</span>
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/products/${product.id}`}
                    className="flex-1 rounded-xl border border-border-default py-2 text-center text-sm font-semibold text-text-primary hover:bg-surface-subtle transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => addItem(product.id, 1)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
                  >
                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                  </button>
                </div>
                <button
                  onClick={() => removeItem(product.id)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium text-text-danger hover:bg-surface-danger-soft transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove from wishlist
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-base px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-subtle transition-colors shadow-sm"
          >
            <ChevronDown className="h-4 w-4" />
            Show more ({wishlistProducts.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </>
  );
}
