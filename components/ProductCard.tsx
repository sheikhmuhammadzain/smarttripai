"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { type Product } from "@/lib/data";
import CurrencyAmount from "@/components/CurrencyAmount";

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
}

export default function ProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border-soft bg-surface-base transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-border-default"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* bottom gradient for contrast */}
        <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent" />

        {product.badge ? (
          <div className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
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
          className={`absolute right-3 top-3 z-10 rounded-full p-2 shadow-md backdrop-blur-sm transition-colors ${
            isWishlisted ? "bg-white/90 hover:bg-white" : "bg-white/70 hover:bg-white/90"
          }`}
          aria-label={`Save ${product.title} to wishlist`}
        >
          <Heart
            className={`h-4 w-4 stroke-2 ${isWishlisted ? "fill-red-500 text-red-500" : "text-text-muted"}`}
          />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 gap-1.5">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-text-heading transition-colors group-hover:text-brand">
          {product.title}
        </h3>

        {product.features && product.features.length > 0 ? (
          <p className="text-xs text-text-muted line-clamp-1">
            {product.duration} · {product.features.join(" · ")}
          </p>
        ) : (
          <p className="text-xs text-text-muted">{product.duration}</p>
        )}

        {/* Rating */}
        <div className="mt-auto pt-3 flex items-center gap-1.5">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <svg
                key={`${product.id}-${i}`}
                className={`h-3.5 w-3.5 ${i < Math.floor(product.rating) ? "fill-current" : "fill-current text-border-strong"}`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-xs font-semibold text-text-body">{product.rating}</span>
          <span className="text-xs text-text-subtle">({product.reviews.toLocaleString()})</span>
        </div>

        {/* Price + booked row */}
        <div className="flex items-end justify-between gap-2 pt-1 border-t border-border-soft mt-1">
          <div>
            <span className="text-[11px] text-text-subtle">From </span>
            <CurrencyAmount amount={product.price} baseCurrency={product.currency} className="text-base font-extrabold text-text-heading" />
            <span className="text-[11px] text-text-subtle"> / person</span>
          </div>

          {product.bookedText ? (
            <span className="shrink-0 rounded-full bg-brand/8 px-2.5 py-1 text-[10px] font-semibold text-brand">
              {product.bookedText}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

