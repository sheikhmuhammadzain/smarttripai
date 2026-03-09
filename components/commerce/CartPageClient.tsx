"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  CheckCircle2,
  Clock,
  Users,
  Bookmark,
  Lock,
  MessageCircle,
  Star,
  ChevronRight,
  Edit2,
  ArrowRight,
  Check,
} from "lucide-react";
import { getProductById } from "@/lib/data";
import { getLanguageLocale, useAppPreferences } from "@/lib/preferences-client";
import { useCartState } from "@/components/commerce/cart-client";

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < full
            ? "fill-amber-400 text-amber-400"
            : "fill-surface-subtle text-border-default"
            }`}
        />
      ))}
      <span className="ml-1 text-xs text-text-muted">{rating.toFixed(1)}</span>
    </span>
  );
}

function subscribeToTodayLabel(_callback: () => void) {
  void _callback;
  return () => { };
}

function getTodayLabelSnapshot() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function CartPageClient() {
  const { items, removeItem, clearCart } = useCartState();
  const { preferences } = useAppPreferences();
  const countdown = useCountdown(30 * 60);
  const [conversionRates, setConversionRates] = useState<Record<string, number>>({});
  const todayLabel = useSyncExternalStore(
    subscribeToTodayLabel,
    getTodayLabelSnapshot,
    () => "Today",
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRates() {
      const bases = Array.from(
        new Set(
          items
            .map((item) => getProductById(item.productId)?.currency)
            .filter((v): v is string => Boolean(v)),
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
            const res = await fetch(
              `/api/v1/realtime/currency?base=${encodeURIComponent(base)}&target=${encodeURIComponent(preferences.currency)}`,
              { cache: "no-store" },
            );
            if (!res.ok) { nextRates[base] = 1; return; }
            const body = (await res.json()) as { rate?: number };
            nextRates[base] =
              typeof body.rate === "number" && Number.isFinite(body.rate)
                ? body.rate
                : 1;
          } catch {
            nextRates[base] = 1;
          }
        }),
      );

      if (!cancelled) setConversionRates(nextRates);
    }

    void loadRates();
    return () => { cancelled = true; };
  }, [items, preferences.currency]);

  const convertedTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const p = getProductById(item.productId);
        if (!p) return sum;
        return sum + p.price * item.quantity * (conversionRates[p.currency] ?? 1);
      }, 0),
    [conversionRates, items],
  );

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

  /* ─── Helpers ──────────────────────────────────── */
  const locale = getLanguageLocale(preferences.language);
  const fmt = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: preferences.currency,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  /* ─── Cart ─────────────────────────────────────── */
  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-5">
        <ol className="flex items-center gap-1.5 text-xs text-text-muted">
          <li>
            <Link href="/" className="transition-colors hover:text-brand">Home</Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="font-medium text-text-body">Cart</li>
        </ol>
      </nav>

      {/* Title */}
      <h1 className="mb-4 text-2xl font-bold text-text-primary">Shopping cart</h1>

      {/* Countdown banner */}
      <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[#cf5e7f] bg-[#f8d7e2] px-4 py-2 text-sm font-medium dark:border-rose-700/60 dark:bg-rose-900/50">
        <Clock className="h-4 w-4 shrink-0 text-[#b4234d]! dark:text-rose-400" />
        <span className="text-[#7a1632]! dark:text-rose-200">
          We&apos;ll hold your spot for{" "}
          <strong className="font-extrabold text-[#651126]! dark:text-white">{countdown}</strong> minutes.
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ─── Items column ───────────────────────── */}
        <div>
          {/* Date group header */}
          <div className="mb-4 border-b border-border-subtle pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {todayLabel || "Today"}
            </p>
          </div>

          <div className="space-y-4">
            {items.map((item) => {
              const product = getProductById(item.productId);
              if (!product) return null;

              const unitConverted = Math.round(
                product.price * (conversionRates[product.currency] ?? 1),
              );
              const lineFormatted = fmt(unitConverted * item.quantity);

              return (
                <article
                  key={item.productId}
                  className="flex gap-4 rounded-2xl border border-border-soft bg-surface-base p-4"
                >
                  {/* Thumbnail */}
                  <Link
                    href={`/products/${product.id}`}
                    className="relative shrink-0 overflow-hidden rounded-xl"
                  >
                    <Image
                      src={product.image}
                      alt={product.title}
                      width={120}
                      height={90}
                      className="h-22.5 w-30 object-cover"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {/* Title + price */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${product.id}`}
                          className="line-clamp-2 font-bold leading-snug text-text-primary transition-colors hover:text-brand"
                        >
                          {product.title}
                        </Link>
                        <div className="mt-1">
                          <Stars rating={product.rating} />
                        </div>
                      </div>
                      <p className="shrink-0 text-lg font-bold text-text-primary">
                        {lineFormatted}
                      </p>
                    </div>

                    {/* Option meta */}
                    <div className="space-y-1 text-xs text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <Bookmark className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
                        <span>Standard option</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 shrink-0 text-text-subtle" />
                        <span>
                          Adult × {item.quantity} · {fmt(unitConverted)} per person
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          Free cancellation
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${product.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-body transition-colors hover:bg-surface-subtle"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Link>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="flex items-center justify-center rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-danger-soft hover:text-text-danger"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Total row */}
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-border-subtle pt-4">
            <div className="text-right">
              <p className="text-sm font-bold text-text-primary">
                Total {fmt(convertedTotal)}
              </p>
              <p className="text-xs text-text-muted">All taxes and fees included</p>
            </div>
          </div>
        </div>

        {/* ─── Sidebar ────────────────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-24 h-fit">

          {/* Subtotal card */}
          <div className="rounded-2xl border border-border-soft bg-surface-base p-5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-text-primary">
                Subtotal ({totalQty} item{totalQty !== 1 ? "s" : ""})
              </span>
              <span className="text-xl font-bold text-text-primary">
                {fmt(convertedTotal)}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              All taxes and fees included
            </p>

            <Link
              href="/checkout"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Go to checkout
            </Link>

            <button
              type="button"
              onClick={clearCart}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border-strong py-3 text-sm font-semibold text-text-body transition-colors hover:bg-surface-subtle"
            >
              Cancel cart
            </button>

            {/* Payment badges */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["VISA", "Mastercard", "PayPal", "G Pay"].map((name) => (
                <span
                  key={name}
                  className="inline-flex h-6 items-center rounded border border-border-soft bg-white px-2 text-[10px] font-bold tracking-tight text-slate-600 dark:bg-surface-subtle dark:text-text-muted"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Free cancellation */}
          <div className="rounded-2xl border border-border-soft bg-surface-base p-4">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Free cancellation
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Cancel up to 24 hours before the activity for a full refund
                </p>
              </div>
            </div>
          </div>

          {/* Why book with us */}
          <div className="rounded-2xl border border-border-soft bg-surface-base p-4">
            <p className="mb-3 text-sm font-bold text-text-primary">
              Why book with us?
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-text-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>
                  <span className="font-semibold text-text-body">Secure payment</span>{" "}
                  — your data is always protected
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-text-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>
                  <span className="font-semibold text-text-body">No hidden costs</span>{" "}
                  — all taxes and fees included
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-text-muted">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <span>
                  <span className="font-semibold text-text-body">
                    24/7 customer support
                  </span>{" "}
                  worldwide
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
