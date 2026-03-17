"use client";

import { useMemo, useEffect, useState } from "react";
import { products } from "@/lib/data";
import { useWishlist } from "@/hooks/use-wishlist";
import ProductCard from "./ProductCard";

const INITIAL_COUNT = 4;
const LOAD_MORE_COUNT = 4;

export default function ProductList({
  searchQuery = "",
  onCountChange,
}: {
  searchQuery?: string;
  onCountChange?: (count: number) => void;
}) {
  const { isWishlisted, toggle } = useWishlist();
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) return products;
    return products.filter((product) => {
      const haystack = `${product.title} ${product.location} ${product.category} ${product.summary}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [normalizedQuery]);

  useEffect(() => {
    onCountChange?.(filteredProducts.length);
  }, [filteredProducts.length, onCountChange]);

  function toggleWishlist(productId: string) {
    void toggle(productId);
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="rounded-2xl border border-border-default bg-surface-muted p-6">
        <p className="text-lg font-semibold text-text-heading">No matching experiences found</p>
        <p className="mt-2 text-sm text-text-body">Try another destination keyword like Istanbul, Cappadocia, or Ephesus.</p>
      </div>
    );
  }

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isWishlisted={isWishlisted(product.id)}
            onToggleWishlist={toggleWishlist}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            onClick={() => setVisibleCount((c) => c + LOAD_MORE_COUNT)}
            className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-base px-6 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition-all hover:border-brand hover:text-brand hover:shadow-md active:scale-95"
          >
            View More Experiences
            <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-text-muted">
              {filteredProducts.length - visibleCount} remaining
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
