/**
 * Pipeline Stage 2 — Context Data Collection
 *
 * Fetches real-time weather, currency rates, and transport estimates in parallel.
 * Uses Promise.allSettled so a single failing API never aborts the pipeline.
 * Every external call gracefully degrades to fallback values on failure.
 */
import type { ItineraryRequest } from "@/types/travel";
import type { ContextData, CityWeatherSummary, CurrencySummary, TransportLeg } from "./pipeline.types";
import { getWeather } from "@/modules/realtime/weather.service";
import { getCurrencyRate } from "@/modules/realtime/currency.service";
import { getTransportGuidance } from "@/modules/realtime/transport.service";
import { WEATHER_CITY_MAP } from "@/lib/city-maps";
import { logger } from "@/lib/observability/logger";

/* ── Weather for every requested destination ─────────────────────────────── */
async function collectWeather(
  destinations: string[],
): Promise<Record<string, CityWeatherSummary>> {
  const results = await Promise.allSettled(
    destinations.map(async (dest) => {
      const weatherCity = WEATHER_CITY_MAP[dest] ?? dest;
      const data = await getWeather(weatherCity, 6);
      const summary: CityWeatherSummary = {
        city: data.city,
        temperatureC: data.temperatureC,
        description: data.description,
        humidity: data.humidity,
        windKph: data.windKph,
        icon: data.icon,
        source: data.source,
      };
      return { key: dest, summary };
    }),
  );

  const map: Record<string, CityWeatherSummary> = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      map[result.value.key] = result.value.summary;
    } else {
      logger.warn("Weather fetch failed for a destination", {
        reason: result.reason instanceof Error ? result.reason.message : "unknown",
      });
    }
  }
  return map;
}

/* ── Currency rates ──────────────────────────────────────────────────────── */
async function collectCurrency(): Promise<CurrencySummary> {
  const [eurResult, usdResult] = await Promise.allSettled([
    getCurrencyRate("EUR", "TRY"),
    getCurrencyRate("USD", "TRY"),
  ]);

  const eurRate = eurResult.status === "fulfilled" ? eurResult.value : null;
  const usdRate = usdResult.status === "fulfilled" ? usdResult.value : null;

  if (eurResult.status === "rejected") {
    logger.warn("EUR->TRY currency fetch failed", {
      reason: eurResult.reason instanceof Error ? eurResult.reason.message : "unknown",
    });
  }
  if (usdResult.status === "rejected") {
    logger.warn("USD->TRY currency fetch failed", {
      reason: usdResult.reason instanceof Error ? usdResult.reason.message : "unknown",
    });
  }

  return {
    eurToTry: eurRate?.rate ?? 38,
    usdToTry: usdRate?.rate ?? 34,
    asOf: eurRate?.asOf ?? usdRate?.asOf ?? new Date().toISOString(),
    source: eurRate?.source === "exchangerate-api" || usdRate?.source === "exchangerate-api"
      ? "exchangerate-api"
      : "fallback",
  };
}

/* ── Transport legs between consecutive destinations ─────────────────────── */
async function collectTransport(
  destinations: string[],
  mode: "car" | "bus" | "flight",
): Promise<TransportLeg[]> {
  if (destinations.length < 2) return [];

  const pairs: { from: string; to: string }[] = [];
  for (let i = 0; i < destinations.length - 1; i += 1) {
    pairs.push({ from: destinations[i], to: destinations[i + 1] });
  }

  const results = await Promise.allSettled(
    pairs.map(async (pair) => {
      const data = await getTransportGuidance(pair.from, pair.to, mode);
      const leg: TransportLeg = {
        from: data.from,
        to: data.to,
        mode: data.mode,
        distanceKm: data.distanceKm,
        estimatedDurationHours: data.estimatedDurationHours,
        recommendation: data.recommendation,
        source: data.source,
      };
      return leg;
    }),
  );

  const legs: TransportLeg[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      legs.push(result.value);
    } else {
      logger.warn("Transport leg fetch failed", {
        reason: result.reason instanceof Error ? result.reason.message : "unknown",
      });
    }
  }
  return legs;
}

/* ── Public API — runs all three collectors in parallel ───────────────────── */
export async function collectContextData(
  request: ItineraryRequest,
  transportMode: "car" | "bus" | "flight" = "bus",
): Promise<ContextData> {
  const [weather, currency, transportLegs] = await Promise.all([
    collectWeather(request.destinations),
    collectCurrency(),
    collectTransport(request.destinations, transportMode),
  ]);

  return {
    collectedAt: new Date().toISOString(),
    weather,
    currency,
    transportLegs,
  };
}
