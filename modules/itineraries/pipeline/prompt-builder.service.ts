/**
 * Pipeline Stage 3 — Prompt Construction
 *
 * Builds a structured dual-block prompt that combines:
 *   - User travel preferences
 *   - Real-time contextual data (weather, currency, transport)
 *   - A deterministic base itinerary (for the AI to enhance, not regenerate)
 *
 * The system prompt is a stable, cacheable instruction set.
 * The user prompt varies per request — a well-known prompt engineering pattern.
 */
import type { GeneratedItinerary, ItineraryRequest } from "@/types/travel";
import type { ContextData } from "./pipeline.types";

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export interface ConstructedPrompt {
  systemPrompt: string;
  userPrompt: string;
  estimatedTokens: number;
}

export function buildItineraryPrompt(
  request: ItineraryRequest,
  deterministicPlan: GeneratedItinerary,
  context: ContextData,
): ConstructedPrompt {
  const totalDays = daysBetween(request.startDate, request.endDate);
  const cityList = request.destinations.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ");

  /* ── System Prompt (stable instruction set) ────────────────────────────── */
  const systemPrompt = [
    "You are an elite professional travel concierge specializing in Turkey.",
    "Your task: Given a base day-by-day itinerary, user preferences, and real-time travel context,",
    "produce a fully enhanced, professional JSON itinerary.",
    "",
    "STRICT RULES:",
    `1. Output EXACTLY ${totalDays} days.`,
    `2. Include these cities in order: [${cityList}].`,
    "3. Do NOT invent attraction IDs — use ONLY the IDs provided in the base plan.",
    "4. Use the provided weather data to suggest indoor alternatives on rainy days.",
    "5. Use currency rates to ensure cost estimates are realistic for the budget level.",
    "6. Use transport data to write accurate, specific transport hints between stops.",
    "7. Respond ONLY with valid JSON — no markdown, no prose, no code blocks.",
    "",
    "OUTPUT JSON SCHEMA:",
    "{",
    '  "title": "string — catchy trip title",',
    '  "cityOrder": ["string — ordered city names"],',
    '  "days": [{',
    '    "day": "number (1-indexed)",',
    '    "city": "string",',
    '    "theme": "string — catchy day theme (e.g. Ottoman Grandeur & Local Flavors)",',
    '    "items": [{',
    '      "attractionId": "string — must match base plan ID",',
    '      "attractionName": "string",',
    '      "attractionSlug": "string (optional)",',
    '      "attractionDescription": "string — 1-2 sentence vivid description",',
    '      "startTime": "HH:MM",',
    '      "endTime": "HH:MM",',
    '      "costEstimateTRY": "number >= 0",',
    '      "transportHint": "string — specific directions to this stop"',
    '    }],',
    '    "notes": ["string — 1-3 practical tips for this day"],',
    '    "insiderTip": "string — one highly specific local secret"',
    '  }],',
    '  "totalEstimatedCostTRY": "number — sum of all items"',
    "}",
  ].join("\n");

  /* ── User Prompt (variable per request) ────────────────────────────────── */
  const weatherSummary: Record<string, { tempC: number; description: string; humidity: number }> = {};
  for (const [city, w] of Object.entries(context.weather)) {
    weatherSummary[city] = {
      tempC: w.temperatureC,
      description: w.description,
      humidity: w.humidity,
    };
  }

  const userPromptObj = {
    userPreferences: {
      destinations: request.destinations,
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays,
      budgetLevel: request.budgetLevel,
      interests: request.interests,
      travelers: request.travelers,
      pace: request.pace,
    },
    realtimeContext: {
      weather: weatherSummary,
      currency: {
        EUR_to_TRY: context.currency.eurToTry,
        USD_to_TRY: context.currency.usdToTry,
        note: "Use these live rates for all cost estimates.",
      },
      transportLegs: context.transportLegs.map((leg) => ({
        from: leg.from,
        to: leg.to,
        mode: leg.mode,
        distanceKm: leg.distanceKm,
        estimatedHours: leg.estimatedDurationHours,
        recommendation: leg.recommendation,
      })),
    },
    deterministicBasePlan: {
      title: deterministicPlan.title,
      cityOrder: deterministicPlan.cityOrder,
      days: deterministicPlan.days.map((d) => ({
        day: d.day,
        city: d.city,
        items: d.items.map((item) => ({
          attractionId: item.attractionId,
          attractionName: item.attractionName,
          attractionSlug: item.attractionSlug,
          startTime: item.startTime,
          endTime: item.endTime,
          costEstimateTRY: item.costEstimateTRY,
        })),
      })),
      totalEstimatedCostTRY: deterministicPlan.totalEstimatedCostTRY,
    },
  };

  const userPrompt = JSON.stringify(userPromptObj, null, 2);

  // Rough token estimate: ~4 chars per token
  const estimatedTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);

  return { systemPrompt, userPrompt, estimatedTokens };
}
