"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { products } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import { useWishlist } from "@/hooks/use-wishlist";

const CITIES = [
  "Istanbul",
  "Cappadocia",
  "Ephesus",
  "Pamukkale",
  "Bodrum",
  "Antalya",
  "Bursa",
  "Ankara",
  "Trabzon",
  "Konya",
  "Canakkale",
];

const CATEGORIES = ["Adventure", "Culture", "History", "Nature"];

type SortKey = "recommended" | "price-asc" | "price-desc" | "rating";

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-border-default bg-surface-base text-text-body hover:border-brand hover:text-brand"
      }`}
    >
      {label}
    </button>
  );
}

export default function ProductsPageClient({
  initialCity,
  initialCategory,
}: {
  initialCity?: string;
  initialCategory?: string;
}) {
  const [selectedCity, setSelectedCity] = useState<string | null>(
    initialCity ?? null,
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory ?? null,
  );
  const [sortBy, setSortBy] = useState<SortKey>("recommended");
  const { isWishlisted, toggle } = useWishlist();

  function toggleWishlist(productId: string) {
    void toggle(productId);
  }

  const filtered = useMemo(() => {
    let list = [...products];
    if (selectedCity) {
      list = list.filter((p) =>
        p.location.toLowerCase() === selectedCity.toLowerCase(),
      );
    }
    if (selectedCategory) {
      list = list.filter((p) =>
        p.category.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }
    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }
    return list;
  }, [selectedCity, selectedCategory, sortBy]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          All Experiences in Turkey
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {filtered.length} experience{filtered.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Chip
            label="All cities"
            active={selectedCity === null}
            onClick={() => setSelectedCity(null)}
          />
          {CITIES.map((city) => (
            <Chip
              key={city}
              label={city}
              active={selectedCity === city}
              onClick={() =>
                setSelectedCity((prev) => (prev === city ? null : city))
              }
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-text-muted">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter:
            </span>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                active={selectedCategory === cat}
                onClick={() =>
                  setSelectedCategory((prev) => (prev === cat ? null : cat))
                }
              />
            ))}
          </div>

          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-9 appearance-none rounded-lg border border-border-default bg-surface-base pl-3 pr-8 text-xs font-semibold text-text-body outline-none focus:border-brand"
            >
              <option value="recommended">Recommended</option>
              <option value="price-asc">Price: Low â†’ High</option>
              <option value="price-desc">Price: High â†’ Low</option>
              <option value="rating">Top Rated</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-subtle" />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border-soft bg-surface-subtle p-10 text-center">
          <p className="text-base font-semibold text-text-primary">
            No experiences match your filters
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Try removing a filter to see more results.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCity(null);
              setSelectedCategory(null);
            }}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={isWishlisted(product.id)}
              onToggleWishlist={toggleWishlist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
