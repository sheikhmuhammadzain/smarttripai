"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  MapPin,
  Clock,
  Shield,
  ArrowRight,
  Minus,
  Plus,
  ChevronRight,
  Package,
} from "lucide-react";
import { getProductById } from "@/lib/data";
import { getLanguageLocale, useAppPreferences } from "@/lib/preferences-client";
import { useCartState } from "@/components/commerce/cart-client";

export default function CartPageClient() {
  const { items, updateQuantity, removeItem } = useCartState();
  const { preferences } = useAppPreferences();
  const [conversionRates, setConversionRates] = useState<Record<string, number>>({});

  const convertedTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = getProductById(item.productId);
        if (!product) return sum;
        const rate = conversionRates[product.currency] ?? 1;
        return sum + product.price * item.quantity * rate;
      }, 0),
    [conversionRates, items],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRates() {
      const bases = Array.from(
        new Set(
          items
            .map((item) => getProductById(item.productId)?.currency)
            .filter((value): value is string => Boolean(value)),
        ),
      );

      const nextRates: Record<string, number> = {};

      await Promise.all(
        bases.map(async (base) => {
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
            nextRates[base] =
              typeof body.rate === "number" && Number.isFinite(body.rate)
                ? body.rate
                : 1;
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
  }, [items, preferences.currency]);

  /* ─── Empty State ─────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-subtle">
          <ShoppingBag className="h-9 w-9 text-text-subtle" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Your cart is empty</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
          Looks like you haven&apos;t added any experiences yet. Browse our curated
          tours and start planning your Turkey adventure.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Explore Experiences
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  /* ─── Cart with Items ─────────────────────────── */
  const locale = getLanguageLocale(preferences.language);
  const formattedTotal = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: preferences.currency,
    maximumFractionDigits: 0,
  }).format(Math.round(convertedTotal));

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-1.5 text-xs text-text-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-brand">
              Home
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="font-medium text-text-body">Cart</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Shopping Cart</h1>
          <p className="mt-1 text-sm text-text-muted">
            {items.length} {items.length === 1 ? "experience" : "experiences"} in
            your cart
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ─── Items Column ───────────────────────── */}
        <div className="space-y-3">
          {items.map((item) => {
            const product = getProductById(item.productId);
            if (!product) return null;

            const convertedUnitPrice = Math.round(
              product.price * (conversionRates[product.currency] ?? 1),
            );
            const formattedUnitPrice = new Intl.NumberFormat(locale, {
              style: "currency",
              currency: preferences.currency,
              maximumFractionDigits: 0,
            }).format(convertedUnitPrice);

            const lineTotal = new Intl.NumberFormat(locale, {
              style: "currency",
              currency: preferences.currency,
              maximumFractionDigits: 0,
            }).format(convertedUnitPrice * item.quantity);

            return (
              <article
                key={item.productId}
                className="flex gap-4 rounded-2xl border border-border-soft bg-white p-4 transition-colors sm:p-5"
              >
                {/* Thumbnail */}
                <Link
                  href={`/products/${product.id}`}
                  className="relative shrink-0 overflow-hidden rounded-xl"
                >
                  <Image
                    src={product.image}
                    alt={product.title}
                    width={160}
                    height={120}
                    className="h-24 w-32 object-cover sm:h-28 sm:w-36"
                  />
                </Link>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <Link
                      href={`/products/${product.id}`}
                      className="text-sm font-semibold leading-snug text-text-primary transition-colors hover:text-brand line-clamp-2"
                    >
                      {product.title}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {product.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {product.duration}
                      </span>
                    </div>
                  </div>

                  {/* Bottom row: quantity + price */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      {/* Quantity stepper */}
                      <div className="flex items-center rounded-lg border border-border-default overflow-hidden">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              Math.max(1, item.quantity - 1),
                            )
                          }
                          className="px-2.5 py-1.5 text-xs text-text-body transition-colors hover:bg-surface-subtle"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[2rem] border-x border-border-default py-1.5 text-center text-xs font-semibold text-text-primary">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              Math.min(10, item.quantity + 1),
                            )
                          }
                          className="px-2.5 py-1.5 text-xs text-text-body transition-colors hover:bg-surface-subtle"
                          aria-label="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="ml-1 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-danger-soft hover:text-text-danger"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-xs text-text-muted">
                        {formattedUnitPrice} × {item.quantity}
                      </p>
                      <p className="text-sm font-bold text-text-primary">{lineTotal}</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* ─── Order Summary ──────────────────────── */}
        <aside className="h-fit space-y-5 rounded-2xl border border-border-soft bg-white p-6 lg:sticky lg:top-24">
          <h2 className="text-sm font-bold uppercase tracking-wide text-text-primary">
            Order Summary
          </h2>

          {/* Line items summary */}
          <div className="space-y-2.5">
            {items.map((item) => {
              const product = getProductById(item.productId);
              if (!product) return null;
              const unitPrice = Math.round(
                product.price * (conversionRates[product.currency] ?? 1),
              );
              const total = new Intl.NumberFormat(locale, {
                style: "currency",
                currency: preferences.currency,
                maximumFractionDigits: 0,
              }).format(unitPrice * item.quantity);

              return (
                <div
                  key={item.productId}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="max-w-[180px] truncate text-text-body">
                    {product.title}
                  </span>
                  <span className="font-medium text-text-primary">{total}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border-subtle pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Subtotal</span>
              <span className="text-xl font-bold text-text-primary">
                {formattedTotal}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-subtle">
              Taxes and fees calculated at checkout
            </p>
          </div>

          <Link
            href="/checkout"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Continue to Checkout
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border-default px-5 py-2.5 text-sm font-medium text-text-body transition-colors hover:bg-surface-subtle"
          >
            Continue Shopping
          </Link>

          {/* Trust badges */}
          <div className="space-y-2.5 border-t border-border-subtle pt-4">
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <Shield className="h-3.5 w-3.5 shrink-0 text-brand" />
              Free cancellation up to 24 hours before
            </div>
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <Package className="h-3.5 w-3.5 shrink-0 text-brand" />
              Instant booking confirmation
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
