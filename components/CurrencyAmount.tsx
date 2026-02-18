"use client";

import { useEffect, useMemo, useState } from "react";
import { getLanguageLocale, useAppPreferences } from "@/lib/preferences-client";

const rateCache = new Map<string, number>();
const inFlightRateRequests = new Map<string, Promise<number>>();

async function getRate(base: string, target: string) {
  if (base === target) return 1;

  const cacheKey = `${base}->${target}`;
  const cached = rateCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const existingPromise = inFlightRateRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(
        `/api/v1/realtime/currency?base=${encodeURIComponent(base)}&target=${encodeURIComponent(target)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        return 1;
      }
      const body = (await response.json()) as { rate?: number };
      const rate = typeof body.rate === "number" && Number.isFinite(body.rate) ? body.rate : 1;
      rateCache.set(cacheKey, rate);
      return rate;
    } catch {
      return 1;
    } finally {
      inFlightRateRequests.delete(cacheKey);
    }
  })();

  inFlightRateRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

export default function CurrencyAmount({
  amount,
  baseCurrency,
  minimumFractionDigits = 0,
  maximumFractionDigits = 0,
  className,
}: {
  amount: number;
  baseCurrency: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  className?: string;
}) {
  const { preferences } = useAppPreferences();
  const [rate, setRate] = useState(1);
  const locale = getLanguageLocale(preferences.language);

  useEffect(() => {
    let cancelled = false;

    async function loadRate() {
      const nextRate = await getRate(baseCurrency, preferences.currency);
      if (!cancelled) {
        setRate(nextRate);
      }
    }

    void loadRate();
    return () => {
      cancelled = true;
    };
  }, [baseCurrency, preferences.currency]);

  const formatted = useMemo(() => {
    const converted = amount * rate;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: preferences.currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(converted);
  }, [amount, locale, maximumFractionDigits, minimumFractionDigits, preferences.currency, rate]);

  return <span className={className}>{formatted}</span>;
}
