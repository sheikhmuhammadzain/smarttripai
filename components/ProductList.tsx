"use client";

import { useMemo, useEffect } from "react";
import { products } from "@/lib/data";
import { useWishlist } from "@/hooks/use-wishlist";
import ProductCard from "./ProductCard";

export default function ProductList({
  searchQuery = "",
  onCountChange,
}: {
  searchQuery?: string;
  onCountChange?: (count: number) => void;
}) {
  const { isWishlisted, toggle } = useWishlist();

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) return products;
    return products.filter((product) => {
      const haystack = `${product.title} ${product.location} ${product.category} ${product.summary}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {filteredProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isWishlisted={isWishlisted(product.id)}
          onToggleWishlist={toggleWishlist}
        />
      ))}
    </div>
  );
}
