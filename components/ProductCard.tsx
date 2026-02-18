"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { type Product } from "@/lib/data";
import { getLanguageLocale, type AppLanguage, type AppCurrency } from "@/lib/preferences-client";

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  language: AppLanguage;
  currency: AppCurrency;
  conversionRates: Record<string, number>;
}

export default function ProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
  language,
  currency,
  conversionRates,
}: ProductCardProps) {
  const baseRate = conversionRates[product.currency] ?? 1;
  const converted = Math.round(product.price * baseRate);
  const formattedPrice = new Intl.NumberFormat(getLanguageLocale(language), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(converted);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {product.badge ? (
          <div className="absolute left-3 top-3 rounded-sm bg-brand-hover px-2 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
            {product.badge}
          </div>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleWishlist(product.id);
          }}
          className={`absolute right-3 top-3 z-10 rounded-full p-2 shadow-sm transition-colors ${
            isWishlisted ? "bg-red-50 hover:bg-red-100" : "bg-white hover:bg-gray-50"
          }`}
          aria-label={`Save ${product.title} to wishlist`}
        >
          <Heart
            className={`h-5 w-5 stroke-[1.8] ${
              isWishlisted ? "fill-red-500 text-red-500" : "text-gray-700"
            }`}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-3 text-[16px] font-bold leading-[1.4] text-text-heading transition-colors group-hover:text-brand">
          {product.title}
        </h3>

        <div className="text-sm font-normal text-gray-500">
          {product.duration}
          {product.features && product.features.length > 0 ? (
            <>
              <span className="mx-1">•</span>
              {product.features.join(" • ")}
            </>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-1 pt-2">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <svg
                key={`${product.id}-${i}`}
                className={`h-3.5 w-3.5 ${i < Math.floor(product.rating) ? "fill-current" : "fill-current text-gray-300"}`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-xs font-medium text-gray-500">
            {product.rating} ({product.reviews})
          </span>
        </div>

        <div className="mt-1">
          <span className="text-xs text-gray-500">From </span>
          <span className="font-bold text-text-heading">{formattedPrice}</span>
          <span className="text-xs text-gray-500"> per person</span>
        </div>

        {product.bookedText ? (
          <div className="mt-3 w-fit rounded bg-surface-brand-soft px-2 py-1.5 text-xs font-medium text-brand">
            {product.bookedText}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

