"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Globe,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  Shield,
  Lock,
  CreditCard,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getProductById } from "@/lib/data";
import { getLanguageLocale, useAppPreferences } from "@/lib/preferences-client";
import { useCartState } from "@/components/commerce/cart-client";

export default function CheckoutPageClient() {
  const router = useRouter();
  const { items, clearCart } = useCartState();
  const { preferences } = useAppPreferences();
  const [conversionRates, setConversionRates] = useState<Record<string, number>>({});
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("United States");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const locale = getLanguageLocale(preferences.language);

  function formatAmount(value: number) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: preferences.currency,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }

  const formattedTotal = formatAmount(convertedTotal);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          customer: { fullName, email, phone, country },
        }),
      });

      const body = (await response.json()) as {
        orderId?: string;
        detail?: string;
      };
      if (!response.ok || !body.orderId) {
        throw new Error(body.detail ?? "Checkout failed");
      }

      clearCart();
      router.push(
        `/checkout/success?orderId=${encodeURIComponent(body.orderId)}`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Checkout failed",
      );
      setIsSubmitting(false);
    }
  }

  /* ─── Empty State ─────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-subtle">
          <ShoppingBag className="h-9 w-9 text-text-subtle" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Nothing to check out</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
          Your cart is empty. Add at least one experience before proceeding to
          checkout.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Browse Experiences
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  /* ─── Checkout Form ───────────────────────────── */
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
          <li>
            <Link href="/cart" className="transition-colors hover:text-brand">
              Cart
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" />
          <li className="font-medium text-text-body">Checkout</li>
        </ol>
      </nav>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center gap-0">
        {[
          { step: 1, label: "Cart", done: true },
          { step: 2, label: "Details", active: true },
          { step: 3, label: "Confirmation" },
        ].map((s, i) => (
          <div key={s.step} className="flex items-center">
            {i > 0 && (
              <div
                className={`h-px w-10 sm:w-16 ${s.done || s.active ? "bg-brand" : "bg-border-default"}`}
              />
            )}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${s.done
                    ? "bg-brand text-white"
                    : s.active
                      ? "border-2 border-brand text-brand"
                      : "border border-border-default text-text-subtle"
                  }`}
              >
                {s.step}
              </span>
              <span
                className={`hidden text-xs font-medium sm:inline ${s.done || s.active ? "text-text-primary" : "text-text-subtle"
                  }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ─── Form Column ────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-6" id="checkout-form">
          {/* Traveler Details */}
          <section className="rounded-2xl border border-border-soft bg-white p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-text-primary">
              <User className="h-4 w-4 text-brand" />
              Traveler Details
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="fullName"
                  className="text-xs font-medium text-text-muted"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                  <input
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="h-11 w-full rounded-lg border border-border-default bg-white pl-10 pr-3 text-sm text-text-primary placeholder:text-text-subtle transition-colors focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-text-muted"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                  <input
                    id="email"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="h-11 w-full rounded-lg border border-border-default bg-white pl-10 pr-3 text-sm text-text-primary placeholder:text-text-subtle transition-colors focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label
                  htmlFor="phone"
                  className="text-xs font-medium text-text-muted"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                  <input
                    id="phone"
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="h-11 w-full rounded-lg border border-border-default bg-white pl-10 pr-3 text-sm text-text-primary placeholder:text-text-subtle transition-colors focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <label
                  htmlFor="country"
                  className="text-xs font-medium text-text-muted"
                >
                  Country
                </label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                  <input
                    id="country"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Country"
                    className="h-11 w-full rounded-lg border border-border-default bg-white pl-10 pr-3 text-sm text-text-primary placeholder:text-text-subtle transition-colors focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Payment Notice */}
          <section className="rounded-2xl border border-border-soft bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-text-primary">
              <CreditCard className="h-4 w-4 text-brand" />
              Payment
            </h2>
            <div className="rounded-xl bg-surface-brand-soft px-5 py-4">
              <p className="text-sm text-text-brand">
                Your booking will be confirmed instantly. Payment is processed
                securely — no card details are stored on our servers.
              </p>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-border-danger bg-surface-danger-soft px-5 py-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-danger" />
              <p className="text-sm text-text-danger">{error}</p>
            </div>
          )}

          {/* Submit — visible on mobile below form */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60 lg:hidden"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Pay {formattedTotal}
              </>
            )}
          </button>
        </form>

        {/* ─── Order Summary Sidebar ───────────────── */}
        <aside className="h-fit space-y-5 rounded-2xl border border-border-soft bg-white p-6 lg:sticky lg:top-24">
          <h2 className="text-sm font-bold uppercase tracking-wide text-text-primary">
            Order Summary
          </h2>

          {/* Items */}
          <div className="space-y-3">
            {items.map((item) => {
              const product = getProductById(item.productId);
              if (!product) return null;
              const unitPrice =
                product.price * (conversionRates[product.currency] ?? 1);
              const lineTotal = formatAmount(unitPrice * item.quantity);

              return (
                <div
                  key={item.productId}
                  className="flex gap-3 rounded-xl border border-border-subtle p-3"
                >
                  <Image
                    src={product.image}
                    alt={product.title}
                    width={80}
                    height={60}
                    className="h-14 w-18 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <p className="text-xs font-semibold leading-snug text-text-primary line-clamp-2">
                      {product.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-text-muted">
                        Qty: {item.quantity}
                      </span>
                      <span className="text-xs font-bold text-text-primary">
                        {lineTotal}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="space-y-2 border-t border-border-subtle pt-4">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Subtotal</span>
              <span>{formattedTotal}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Taxes & Fees</span>
              <span>Included</span>
            </div>
            <div className="flex items-center justify-between border-t border-border-subtle pt-3">
              <span className="text-sm font-semibold text-text-primary">
                Total
              </span>
              <span className="text-lg font-bold text-text-primary">
                {formattedTotal}
              </span>
            </div>
          </div>

          {/* Desktop Submit */}
          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting}
            className="hidden w-full items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60 lg:flex"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Pay {formattedTotal}
              </>
            )}
          </button>

          {/* Trust */}
          <div className="space-y-2 border-t border-border-subtle pt-4">
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <Shield className="h-3.5 w-3.5 shrink-0 text-brand" />
              Free cancellation up to 24h before
            </div>
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <Lock className="h-3.5 w-3.5 shrink-0 text-brand" />
              Secure encrypted payment
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-text-subtle">
            By completing this booking you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-brand">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-brand">
              Privacy Policy
            </Link>
            .
          </p>
        </aside>
      </div>
    </>
  );
}
