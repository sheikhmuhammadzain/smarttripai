"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Check,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bookmark,
  Users,
  Pencil,
  Gift,
  Star,
  CreditCard,
  Wallet,
  ShoppingBag,
  ArrowRight,
  X,
} from "lucide-react";
import { getProductById } from "@/lib/data";
import { getLanguageLocale, useAppPreferences } from "@/lib/preferences-client";
import { useCartState } from "@/components/commerce/cart-client";
import { CHECKOUT_FORM_KEY } from "@/components/commerce/CheckoutPageClient";

interface CheckoutFormData {
  fullName: string;
  email: string;
  country: string;
  dialCode: string;
  phone: string;
}

/* ─── Helpers ──────────────────────────────────────── */
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

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/* ─── Main ─────────────────────────────────────────── */
export default function CheckoutPaymentClient() {
  const router = useRouter();
  const { items, clearCart } = useCartState();
  const { preferences } = useAppPreferences();
  const countdown = useCountdown(30 * 60);

  const [formData, setFormData] = useState<CheckoutFormData | null>(null);
  const [conversionRates, setConversionRates] = useState<Record<string, number>>({});
  const [usdTotal, setUsdTotal] = useState<number | null>(null);

  /* Payment form */
  const [payMethod, setPayMethod] = useState<"card" | "paypal">("card");
  const [selectedCurrency, setSelectedCurrency] = useState<"preferred" | "usd">("preferred");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [isPaypalDialogOpen, setIsPaypalDialogOpen] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  /* Load saved contact data */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_FORM_KEY);
      if (raw) {
        const data = JSON.parse(raw) as CheckoutFormData;
        setFormData(data);
        setNameOnCard(data.fullName);
        setPaypalEmail(data.email);
      }
    } catch { /* ignore */ }
  }, []);

  /* Currency conversion */
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

  /* USD alternate rate */
  useEffect(() => {
    if (preferences.currency === "USD") { setUsdTotal(null); return; }
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/v1/realtime/currency?base=${encodeURIComponent(preferences.currency)}&target=USD`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const body = (await res.json()) as { rate?: number };
        if (!cancelled && typeof body.rate === "number" && convertedTotal > 0) {
          setUsdTotal(convertedTotal * body.rate);
        }
      } catch { /* ignore */ }
    }
    void load();
    return () => { cancelled = true; };
  }, [preferences.currency, convertedTotal]);

  const locale = getLanguageLocale(preferences.language);
  const fmt = (amount: number, currency = preferences.currency) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);

  async function submitDemoPayment(paymentMethod: "card" | "paypal") {
    if (!formData) {
      setError("Contact details missing. Go back and fill in your details.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          customer: {
            fullName: formData.fullName,
            email: paymentMethod === "paypal" ? (paypalEmail.trim() || formData.email) : formData.email,
            phone: `${formData.dialCode}${formData.phone}`,
            country: formData.country,
          },
        }),
      });
      const body = (await res.json()) as { orderId?: string; detail?: string };
      if (!res.ok || !body.orderId) throw new Error(body.detail ?? "Payment failed");
      localStorage.removeItem(CHECKOUT_FORM_KEY);
      clearCart();
      router.push(`/checkout/success?orderId=${encodeURIComponent(body.orderId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsSubmitting(false);
    }
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    await submitDemoPayment("card");
  }

  async function handlePaypalPay() {
    await submitDemoPayment("paypal");
  }

  /* Empty cart guard */
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-subtle">
          <ShoppingBag className="h-9 w-9 text-text-subtle" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Nothing to pay for</h1>
        <p className="mt-2 max-w-sm text-sm text-text-muted">
          Your cart is empty.
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

  /* ─── Render ──────────────────────────────────────── */
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">

      {/* ══ Left ══════════════════════════════════════ */}
      <div>
        {/* Countdown */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cf5e7f] bg-[#f8d7e2] px-4 py-1.5 text-sm dark:border-rose-700/60 dark:bg-rose-900/50">
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#b4234d]! dark:text-rose-400" />
          <span className="text-[#7a1632]! dark:text-rose-200">
            We&apos;ll hold your spot for{" "}
            <strong className="font-bold text-[#651126]! dark:text-white">{countdown}</strong> minutes.
          </span>
        </div>

        {/* Progress steps */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand">
              <Check className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-sm font-medium text-text-muted">Contact</span>
          </div>
          <div className="h-px w-12 bg-brand sm:w-20" />
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              2
            </span>
            <span className="text-sm font-semibold text-text-primary">Payment</span>
          </div>
        </div>

        {/* ── Currency selection ── */}
        <section className="mb-4 rounded-2xl border border-border-soft bg-surface-base p-5">
          <h2 className="mb-0.5 text-base font-bold text-text-primary">
            Choose your currency
          </h2>
          <p className="mb-4 text-sm text-text-muted">
            Pay in your home currency to avoid bank fees.
          </p>
          <div className="space-y-2">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${selectedCurrency === "preferred"
                ? "border-brand bg-brand/5"
                : "border-border-default hover:bg-surface-subtle"
                }`}
            >
              <input
                type="radio"
                name="currency"
                checked={selectedCurrency === "preferred"}
                onChange={() => setSelectedCurrency("preferred")}
                className="accent-brand"
              />
              <span className="font-semibold text-text-primary">
                {fmt(convertedTotal)}
              </span>
            </label>
            {usdTotal !== null && (
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${selectedCurrency === "usd"
                  ? "border-brand bg-brand/5"
                  : "border-border-default hover:bg-surface-subtle"
                  }`}
              >
                <input
                  type="radio"
                  name="currency"
                  checked={selectedCurrency === "usd"}
                  onChange={() => setSelectedCurrency("usd")}
                  className="accent-brand"
                />
                <span className="font-semibold text-text-primary">
                  {fmt(usdTotal, "USD")}
                </span>
              </label>
            )}
          </div>
        </section>

        {/* ── Payment method ── */}
        <section className="overflow-hidden rounded-2xl border border-border-soft bg-surface-base">
          <h2 className="px-5 pb-4 pt-5 text-base font-bold text-text-primary">
            Select a payment method
          </h2>

          {/* Credit / Debit card */}
          <div className="border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setPayMethod("card")}
              className="flex w-full items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${payMethod === "card" ? "border-brand" : "border-border-default"
                    }`}
                >
                  {payMethod === "card" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                  )}
                </span>
                <span className="text-sm font-semibold text-text-primary">
                  Debit or credit card
                </span>
              </div>
              <CreditCard className="h-5 w-5 text-text-subtle" />
            </button>

            {payMethod === "card" && (
              <form
                onSubmit={handlePay}
                className="border-t border-border-subtle px-5 pb-5 pt-4 space-y-3"
              >
                {/* Card number */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">
                    Card number
                  </label>
                  <div className="relative">
                    <input
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 1234 1234 1234"
                      inputMode="numeric"
                      className="h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 pr-20 text-sm text-text-primary outline-none focus:border-brand"
                    />
                    <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                      <span className="rounded border border-border-soft bg-white px-1 py-0.5 text-[9px] font-black text-red-600">
                        MC
                      </span>
                      <span className="rounded border border-border-soft bg-white px-1 py-0.5 text-[9px] font-black text-blue-700">
                        VISA
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-muted">
                      Expiry (MM/YY)
                    </label>
                    <input
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      className="h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-muted">
                      CVV
                    </label>
                    <input
                      required
                      value={cvv}
                      onChange={(e) =>
                        setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="•••"
                      type="password"
                      inputMode="numeric"
                      className="h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary outline-none focus:border-brand"
                    />
                  </div>
                </div>

                {/* Name on card */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">
                    Name on card
                  </label>
                  <input
                    required
                    value={nameOnCard}
                    onChange={(e) => setNameOnCard(e.target.value)}
                    placeholder="Full name"
                    className="h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary outline-none focus:border-brand"
                  />
                </div>

                {/* Save card */}
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-body">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="h-4 w-4 rounded accent-brand"
                  />
                  Save your payment details
                </label>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-100 px-4 py-3 dark:border-rose-800/40 dark:bg-rose-950/30">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                  </div>
                )}

                {/* Pay now */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Pay now
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-text-muted">
                  Payments are secure and encrypted
                </p>
                <p className="text-[11px] leading-relaxed text-text-subtle">
                  By continuing, you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-brand">
                    terms and conditions
                  </Link>{" "}
                  and the applicable{" "}
                  <Link href="/legal" className="underline hover:text-brand">
                    travel law
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>

          {/* PayPal */}
          <div className="border-t border-border-subtle">
            <button
              type="button"
              onClick={() => {
                setPayMethod("paypal");
                setIsPaypalDialogOpen(true);
              }}
              className="flex w-full items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${payMethod === "paypal" ? "border-brand" : "border-border-default"
                    }`}
                >
                  {payMethod === "paypal" && (
                    <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                  )}
                </span>
                <span className="text-sm font-semibold text-text-primary">PayPal</span>
              </div>
              <span className="text-sm font-bold">
                <span className="text-blue-700">Pay</span>
                <span className="text-sky-500">Pal</span>
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* ══ Right: Order Summary ══════════════════════ */}
      <aside className="h-fit lg:sticky lg:top-24">
        <h2 className="mb-4 text-lg font-bold text-text-primary">Order summary</h2>

        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface-base">
          {items.map((item, idx) => {
            const product = getProductById(item.productId);
            if (!product) return null;
            const unitConverted = Math.round(
              product.price * (conversionRates[product.currency] ?? 1),
            );
            const lineFormatted = new Intl.NumberFormat(locale, {
              style: "currency",
              currency: preferences.currency,
              maximumFractionDigits: 0,
            }).format(unitConverted * item.quantity);

            return (
              <div key={item.productId}>
                {/* Product header */}
                <div className="flex gap-3 p-4">
                  <Image
                    src={product.image}
                    alt={product.title}
                    width={72}
                    height={54}
                    className="h-14 w-[72px] shrink-0 rounded-lg object-cover"
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

                {/* Booking details */}
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
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      Free cancellation
                    </p>
                    <p className="text-xs text-text-muted">
                      Cancel up to 24 hours before for a full refund
                    </p>
                  </div>
                </div>

                <div className="border-t border-border-subtle" />

                {/* Contact details */}
                {formData && (
                  <>
                    <div className="flex items-start justify-between gap-2 px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" />
                        <div className="text-xs text-text-muted">
                          <p className="font-semibold text-text-body">
                            {formData.fullName}
                          </p>
                          <p>{formData.email}</p>
                          <p>
                            {formData.dialCode}
                            {formData.phone}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/checkout"
                        className="shrink-0 text-xs font-semibold text-brand underline underline-offset-2"
                      >
                        Edit
                      </Link>
                    </div>
                    <div className="border-t border-border-subtle" />
                  </>
                )}

                {/* Promo */}
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

                {idx < items.length - 1 && (
                  <div className="border-t-[6px] border-border-subtle" />
                )}
              </div>
            );
          })}

          {items.length > 1 && (
            <>
              <div className="border-t-[6px] border-border-soft" />
              <div className="flex items-baseline justify-between bg-surface-subtle px-4 py-3">
                <span className="text-base font-bold text-text-primary">
                  Grand Total
                </span>
                <span className="text-xl font-bold text-text-primary">
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: preferences.currency,
                    maximumFractionDigits: 0,
                  }).format(Math.round(convertedTotal))}
                </span>
              </div>
            </>
          )}
        </div>
      </aside>

      {isPaypalDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-soft bg-surface-base shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-brand-subtle">
                  <Wallet className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-base font-bold text-text-primary">PayPal checkout</p>
                  <p className="text-xs text-text-muted">Secure payment window</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaypalDialogOpen(false)}
                className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary"
                aria-label="Close PayPal dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm text-text-body">
                Enter your PayPal email to continue and complete your payment.
              </p>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  PayPal email
                </label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="paypal@example.com"
                  className="h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary outline-none focus:border-brand"
                />
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border-soft bg-surface-subtle px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <p className="text-sm text-text-body">
                  You will confirm this payment and return to your booking once it is completed.
                </p>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-100 px-4 py-3 dark:border-rose-800/40 dark:bg-rose-950/30">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaypalDialogOpen(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-lg border border-border-default bg-surface-base text-sm font-semibold text-text-body transition-colors hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handlePaypalPay()}
                  disabled={isSubmitting}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Paying…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Pay with PayPal
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
