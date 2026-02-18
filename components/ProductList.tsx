"use client";

import { useEffect, useMemo, useState } from "react";
import { products } from "@/lib/data";
import { useAppPreferences } from "@/lib/preferences-client";
import ProductCard from "./ProductCard";

interface WishlistResponse {
  items: string[];
  count: number;
}

export default function ProductList() {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [conversionRates, setConversionRates] = useState<Record<string, number>>({});
  const { preferences } = useAppPreferences();

  useEffect(() => {
    let cancelled = false;

    async function loadWishlist() {
      try {
        const response = await fetch("/api/v1/wishlist", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setWishlistIds([]);
          return;
        }

        const body = (await response.json()) as WishlistResponse;
        if (!cancelled) {
          setWishlistIds(body.items ?? []);
          window.dispatchEvent(new CustomEvent("wishlist:changed", { detail: { items: body.items ?? [] } }));
        }
      } catch {
        if (!cancelled) setWishlistIds([]);
      }
    }

    void loadWishlist();
    return () => {
      cancelled = true;
    };
  }, []);

  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadRates() {
      const baseCurrencies = Array.from(new Set(products.map((item) => item.currency)));
      const nextRates: Record<string, number> = {};

      await Promise.all(
        baseCurrencies.map(async (base) => {
          if (base === preferences.currency) {
            nextRates[base] = 1;
            return;
          }

          try {
            const response = await fetch(
              `/api/v1/realtime/currency?base=${encodeURIComponent(base)}&target=${encodeURIComponent(preferences.currency)}`,
              { cache: "no-store" },
            );
            if (!response.ok) {
              nextRates[base] = 1;
              return;
            }
            const body = (await response.json()) as { rate?: number };
            nextRates[base] = typeof body.rate === "number" && Number.isFinite(body.rate) ? body.rate : 1;
          } catch {
            nextRates[base] = 1;
          }
        }),
      );

      if (!cancelled) {
        setConversionRates(nextRates);
      }
    }

    void loadRates();
    return () => {
      cancelled = true;
    };
  }, [preferences.currency]);

  async function toggleWishlist(productId: string) {
    try {
      const response = await fetch("/api/v1/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (response.status === 401) {
        window.location.href = "/auth/signin";
        return;
      }

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as WishlistResponse;
      setWishlistIds(body.items ?? []);
      window.dispatchEvent(new CustomEvent("wishlist:changed", { detail: { items: body.items ?? [] } }));
    } catch {
      // non-blocking UI action
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isWishlisted={wishlistSet.has(product.id)}
          onToggleWishlist={toggleWishlist}
          language={preferences.language}
          currency={preferences.currency}
          conversionRates={conversionRates}
        />
      ))}
    </div>
  );
}
