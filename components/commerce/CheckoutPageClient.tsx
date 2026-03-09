"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ArrowRight,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Bookmark,
  Users,
  Pencil,
  Gift,
  ChevronDown,
  Check,
  Star,
} from "lucide-react";

export const CHECKOUT_FORM_KEY = "gyg_checkout_form_v1";
import { getProductById } from "@/lib/data";
import { getLanguageLocale, useAppPreferences } from "@/lib/preferences-client";
import { useCartState } from "@/components/commerce/cart-client";

/* ─── Country list with dial codes ──────────────── */
const COUNTRIES = [
  { name: "Afghanistan", code: "+93" },
  { name: "Australia", code: "+61" },
  { name: "Bangladesh", code: "+880" },
  { name: "Brazil", code: "+55" },
  { name: "Canada", code: "+1" },
  { name: "China", code: "+86" },
  { name: "Egypt", code: "+20" },
  { name: "France", code: "+33" },
  { name: "Germany", code: "+49" },
  { name: "India", code: "+91" },
  { name: "Indonesia", code: "+62" },
  { name: "Iran", code: "+98" },
  { name: "Iraq", code: "+964" },
  { name: "Italy", code: "+39" },
  { name: "Japan", code: "+81" },
  { name: "Kenya", code: "+254" },
  { name: "Malaysia", code: "+60" },
  { name: "Mexico", code: "+52" },
  { name: "Morocco", code: "+212" },
  { name: "Netherlands", code: "+31" },
  { name: "New Zealand", code: "+64" },
  { name: "Nigeria", code: "+234" },
  { name: "Norway", code: "+47" },
  { name: "Pakistan", code: "+92" },
  { name: "Philippines", code: "+63" },
  { name: "Poland", code: "+48" },
  { name: "Portugal", code: "+351" },
  { name: "Qatar", code: "+974" },
  { name: "Saudi Arabia", code: "+966" },
  { name: "South Africa", code: "+27" },
  { name: "South Korea", code: "+82" },
  { name: "Spain", code: "+34" },
  { name: "Sri Lanka", code: "+94" },
  { name: "Sweden", code: "+46" },
  { name: "Switzerland", code: "+41" },
  { name: "Turkey", code: "+90" },
  { name: "United Arab Emirates", code: "+971" },
  { name: "United Kingdom", code: "+44" },
  { name: "United States", code: "+1" },
  { name: "Vietnam", code: "+84" },
];

/* ─── Countdown ──────────────────────────────────── */
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

/* ─── Stars ──────────────────────────────────────── */
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

/* ─── Floating-label field wrapper ───────────────── */
function FieldBox({
  id,
  label,
  valid,
  children,
}: {
  id: string;
  label: string;
  valid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-lg border border-border-default bg-surface-base transition-colors focus-within:border-brand">
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium text-text-muted"
      >
        {label}
      </label>
      {children}
      {valid && (
        <Check className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────── */
export default function CheckoutPageClient() {
  const router = useRouter();
  const { items } = useCartState();
  const { preferences } = useAppPreferences();
  const countdown = useCountdown(30 * 60);

  const [conversionRates, setConversionRates] = useState<Record<string, number>>({});
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryName, setCountryName] = useState("United Kingdom");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  const selectedCountry =
    COUNTRIES.find((c) => c.name === countryName) ??
    COUNTRIES.find((c) => c.name === "United States")!;

  /* ─── Currency conversion ── */
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
          if (base === preferences.currency) { nextRates[base] = 1; return; }
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
          } catch { nextRates[base] = 1; }
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

  const locale = getLanguageLocale(preferences.language);
  const fmt = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: preferences.currency,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      localStorage.setItem(
        CHECKOUT_FORM_KEY,
        JSON.stringify({
          fullName,
          email,
          country: countryName,
          dialCode: selectedCountry.code,
          phone,
        }),
      );
      router.push("/checkout/payment");
    } catch {
      setError("Could not save your details. Please try again.");
    }
  }

  /* ─── Empty cart ── */
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-subtle">
          <ShoppingBag className="h-9 w-9 text-text-subtle" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Nothing to check out</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
          Your cart is empty. Add at least one experience before proceeding.
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

  /* ─── Checkout ── */
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">

      {/* ══ Left: Form ══════════════════════════════ */}
      <div>
        {/* Countdown pill */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cf5e7f] bg-[#f8d7e2] px-4 py-1.5 text-sm dark:border-rose-700/60 dark:bg-rose-900/50">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#b4234d]! dark:text-rose-400" />
          <span className="text-[#7a1632]! dark:text-rose-200">
            We&apos;ll hold your spot for{" "}
            <strong className="font-bold text-[#651126]! dark:text-white">{countdown}</strong> minutes.
          </span>
        </div>

        <h1 className="mb-1.5 text-2xl font-bold text-text-primary">
          Check your personal details
        </h1>
        <div className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <Lock className="h-4 w-4" />
          Checkout is fast and secure
        </div>

        <form onSubmit={handleSubmit} id="checkout-form" className="space-y-3">
          {/* Full name */}
          <FieldBox
            id="fullName"
            label="Full name"
            valid={fullName.trim().length > 1}
          >
            <input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="h-14 w-full rounded-lg bg-transparent px-4 pb-2 pt-6 text-sm text-text-primary outline-none"
            />
          </FieldBox>

          {/* Email */}
          <FieldBox
            id="email"
            label="Email"
            valid={email.includes("@") && email.includes(".")}
          >
            <input
              id="email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-14 w-full rounded-lg bg-transparent px-4 pb-2 pt-6 text-sm text-text-primary outline-none"
            />
          </FieldBox>

          {/* Country + phone combined box */}
          <div className="rounded-lg border border-border-default bg-surface-base transition-colors focus-within:border-brand">
            {/* Country row */}
            <div className="relative">
              <label className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium text-text-muted">
                Country
              </label>
              <select
                value={countryName}
                onChange={(e) => setCountryName(e.target.value)}
                className="h-14 w-full appearance-none rounded-t-lg bg-transparent px-4 pb-2 pt-6 text-sm text-text-primary outline-none"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            </div>

            {/* Phone row */}
            <div className="relative border-t border-border-default">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                {selectedCountry.code}
              </span>
              <input
                id="phone"
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile phone number"
                className="h-12 w-full rounded-b-lg bg-transparent py-3 pr-4 text-sm text-text-primary outline-none placeholder:text-text-subtle"
                style={{ paddingLeft: `${selectedCountry.code.length * 9 + 20}px` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-text-muted">
            We&apos;ll only contact you with essential updates or changes to your
            booking
          </p>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-100 px-4 py-3 dark:border-rose-800/40 dark:bg-rose-950/30">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Go to payment
          </button>

          {/* Payment badges */}
          <div className="flex flex-wrap gap-1.5">
            {["VISA", "Mastercard", "PayPal", "G Pay"].map((name) => (
              <span
                key={name}
                className="inline-flex h-6 items-center rounded border border-border-soft bg-white px-2 text-[10px] font-bold tracking-tight text-slate-600 dark:bg-surface-subtle dark:text-text-muted"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Free cancellation notice */}
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <div>
              <span className="font-semibold text-text-body">Free cancellation</span>
              <span className="ml-1.5 text-text-muted">
                Cancel up to 24 hours before for a full refund
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* ══ Right: Order Summary ═════════════════════ */}
      <aside className="h-fit lg:sticky lg:top-24">
        <h2 className="mb-4 text-lg font-bold text-text-primary">Order summary</h2>

        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface-base">
          {items.map((item, idx) => {
            const product = getProductById(item.productId);
            if (!product) return null;
            const unitConverted = Math.round(
              product.price * (conversionRates[product.currency] ?? 1),
            );
            const lineFormatted = fmt(unitConverted * item.quantity);

            return (
              <div key={item.productId}>
                {/* Product header */}
                <div className="flex gap-3 p-4">
                  <Image
                    src={product.image}
                    alt={product.title}
                    width={72}
                    height={54}
                    className="h-14 w-18 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug text-text-primary">
                      {product.title}
                    </p>
                    <div className="mt-1">
                      <Stars rating={product.rating} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border-subtle" />

                {/* Details */}
                <div className="space-y-2.5 px-4 py-3">
                  <div className="flex items-start gap-2.5 text-sm text-text-body">
                    <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
                    <span>Standard option</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-sm text-text-muted">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
                    <span>{product.duration} · starts at 9:00 AM</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-sm text-text-body">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
                    <span>
                      {item.quantity} adult{item.quantity > 1 ? "s" : ""} (Age 0–99)
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-sm">
                    <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
                    <Link
                      href={`/products/${product.id}`}
                      className="text-text-body underline underline-offset-2 hover:text-brand"
                    >
                      Change date or participants
                    </Link>
                  </div>
                </div>

                <div className="border-t border-border-subtle" />

                {/* Free cancellation */}
                <div className="flex items-start gap-2.5 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-text-body">
                      Free cancellation
                    </p>
                    <p className="text-xs text-text-muted">
                      Cancel up to 24 hours before for a full refund
                    </p>
                  </div>
                </div>

                <div className="border-t border-border-subtle" />

                {/* Promo / gift code */}
                <div className="px-4 py-3">
                  {!promoOpen ? (
                    <button
                      type="button"
                      onClick={() => setPromoOpen(true)}
                      className="flex items-center gap-2 text-sm text-text-body underline underline-offset-2 hover:text-brand"
                    >
                      <Gift className="h-4 w-4 text-text-subtle" />
                      Enter promo or gift code
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Promo code"
                        autoFocus
                        className="h-9 flex-1 rounded-lg border border-border-default bg-transparent px-3 text-sm text-text-primary outline-none focus:border-brand"
                      />
                      <button
                        type="button"
                        className="rounded-lg bg-brand px-3 text-xs font-bold text-white hover:bg-brand-hover"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-border-soft" />

                {/* Line total */}
                <div className="px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-text-primary">Total</span>
                    <span className="text-xl font-bold text-text-primary">
                      {lineFormatted}
                    </span>
                  </div>
                  <p className="mt-0.5 text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    All taxes and fees included
                  </p>
                </div>

                {/* Separator between multiple items */}
                {idx < items.length - 1 && (
                  <div className="border-t-[6px] border-border-subtle" />
                )}
              </div>
            );
          })}

          {/* Grand total when multiple items */}
          {items.length > 1 && (
            <>
              <div className="border-t-[6px] border-border-soft" />
              <div className="flex items-baseline justify-between bg-surface-subtle px-4 py-3">
                <span className="text-base font-bold text-text-primary">
                  Grand Total
                </span>
                <span className="text-xl font-bold text-text-primary">
                  {fmt(convertedTotal)}
                </span>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
