/**
 * Pipeline Stage 5 — Post-Processing & Validation
 *
 * Parses raw AI text output into structured GeneratedItinerary data.
 * Runs a 6-step validation and repair pipeline:
 *   1. JSON extraction
 *   2. Schema validation (Zod)
 *   3. Day count check + repair
 *   4. Destination coverage check + repair
 *   5. Attraction ID integrity check
 *   6. Cost sanity check
 *
 * Falls back to the deterministic plan on unrecoverable errors.
 */
import { z } from "zod";
import type { GeneratedItinerary, ItineraryRequest } from "@/types/travel";
import type { PostProcessorResult, ValidationIssue } from "./pipeline.types";
import { logger } from "@/lib/observability/logger";

/* ── Zod schema for runtime AI output validation ─────────────────────────── */
const dayPlanItemSchema = z.object({
  attractionId: z.string().min(1),
  attractionName: z.string().optional(),
  attractionSlug: z.string().optional(),
  attractionDescription: z.string().optional(),
  attractionTags: z.array(z.string()).optional(),
  avgDurationMin: z.number().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  costEstimateTRY: z.number(),
  transportHint: z.string().optional(),
});

const generatedDaySchema = z.object({
  day: z.number().int().positive(),
  city: z.string().min(1),
  theme: z.string().optional(),
  items: z.array(dayPlanItemSchema).min(1),
  notes: z.array(z.string()).default([]),
  insiderTip: z.string().optional(),
});

const generatedItinerarySchema = z.object({
  title: z.string().min(1),
  cityOrder: z.array(z.string().min(1)).min(1),
  days: z.array(generatedDaySchema).min(1),
  totalEstimatedCostTRY: z.number().nonnegative(),
});

/* ── JSON extraction (handles markdown code fences, nested objects) ───────── */
function extractJson(raw: string): unknown | null {
  // Strip markdown code fences
  const stripped = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // Try direct parse first
  try {
    return JSON.parse(stripped);
  } catch {
    // Attempt to find the outermost { ... }
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/* ── Day count repair ────────────────────────────────────────────────────── */
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

/* ── Public API ──────────────────────────────────────────────────────────── */
export function postProcessAIOutput(
  rawText: string,
  request: ItineraryRequest,
  deterministicFallback: GeneratedItinerary,
): PostProcessorResult {
  const issues: ValidationIssue[] = [];
  const repairedFields: string[] = [];
  const expectedDays = daysBetween(request.startDate, request.endDate);

  /* ── Step 1: JSON extraction ───────────────────────────────────────────── */
  const parsed = extractJson(rawText);
  if (parsed === null) {
    logger.warn("Post-processor: malformed JSON from AI, using deterministic fallback");
    issues.push("malformed_json");
    return {
      itinerary: deterministicFallback,
      validationIssues: issues,
      aiOutputAccepted: false,
      repairedFields: [],
    };
  }

  /* ── Step 2: Schema validation ─────────────────────────────────────────── */
  const schemaResult = generatedItinerarySchema.safeParse(parsed);
  if (!schemaResult.success) {
    logger.warn("Post-processor: AI output failed schema validation", {
      zodErrors: schemaResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
    issues.push("schema_invalid");
    return {
      itinerary: deterministicFallback,
      validationIssues: issues,
      aiOutputAccepted: false,
      repairedFields: [],
    };
  }

  const itinerary = schemaResult.data as GeneratedItinerary;

  /* ── Step 3: Day count check + repair ──────────────────────────────────── */
  if (itinerary.days.length !== expectedDays) {
    issues.push("day_count_mismatch");

    if (itinerary.days.length > expectedDays) {
      // Truncate extra days
      itinerary.days = itinerary.days.slice(0, expectedDays);
      repairedFields.push("days.truncated");
    } else {
      // Pad missing days from deterministic fallback
      while (itinerary.days.length < expectedDays) {
        const fallbackDay = deterministicFallback.days[itinerary.days.length];
        if (fallbackDay) {
          itinerary.days.push(fallbackDay);
        } else {
          break;
        }
        repairedFields.push(`days[${itinerary.days.length - 1}].padded`);
      }
    }

    // Renumber day indices
    for (let i = 0; i < itinerary.days.length; i += 1) {
      itinerary.days[i].day = i + 1;
    }
  }

  /* ── Step 4: Destination coverage check ────────────────────────────────── */
  const dayCities = new Set(itinerary.days.map((d) => d.city.toLowerCase()));
  const missingCities = request.destinations.filter((d) => !dayCities.has(d.toLowerCase()));
  if (missingCities.length > 0) {
    issues.push("missing_destinations");
    logger.warn("Post-processor: AI output missing cities", { missingCities });
    // Repair by reassigning orphan days to missing cities
    for (const missing of missingCities) {
      const orphanDay = itinerary.days.find(
        (d) => !request.destinations.includes(d.city.toLowerCase()),
      );
      if (orphanDay) {
        orphanDay.city = missing;
        repairedFields.push(`day[${orphanDay.day}].city`);
      }
    }
  }

  /* ── Step 5: Attraction ID integrity ───────────────────────────────────── */
  const validIds = new Set(
    deterministicFallback.days.flatMap((d) => d.items.map((item) => item.attractionId)),
  );
  let idIssueFound = false;
  for (let di = 0; di < itinerary.days.length; di += 1) {
    for (let ii = 0; ii < itinerary.days[di].items.length; ii += 1) {
      const item = itinerary.days[di].items[ii];
      if (!validIds.has(item.attractionId)) {
        idIssueFound = true;
        // Replace with the deterministic plan's item for same slot
        const fallbackItem = deterministicFallback.days[di]?.items[ii];
        if (fallbackItem) {
          item.attractionId = fallbackItem.attractionId;
          item.attractionName = fallbackItem.attractionName;
          item.attractionSlug = fallbackItem.attractionSlug;
          repairedFields.push(`days[${di}].items[${ii}].attractionId`);
        }
      }
    }
  }
  if (idIssueFound) {
    issues.push("attraction_id_invalid");
  }

  /* ── Step 6: Cost sanity ───────────────────────────────────────────────── */
  let costIssueFound = false;
  for (const day of itinerary.days) {
    for (const item of day.items) {
      if (item.costEstimateTRY < 0) {
        costIssueFound = true;
        item.costEstimateTRY = Math.abs(item.costEstimateTRY);
        repairedFields.push("costEstimateTRY.negative");
      }
    }
  }
  if (costIssueFound) {
    issues.push("cost_negative");
  }

  // Recalculate total cost
  itinerary.totalEstimatedCostTRY = itinerary.days.reduce(
    (sum, day) => sum + day.items.reduce((dSum, item) => dSum + item.costEstimateTRY, 0),
    0,
  );

  /* ── Step 7: Empty days check ──────────────────────────────────────────── */
  for (let di = 0; di < itinerary.days.length; di += 1) {
    if (itinerary.days[di].items.length === 0) {
      issues.push("empty_days");
      const fallbackDay = deterministicFallback.days[di];
      if (fallbackDay) {
        itinerary.days[di].items = fallbackDay.items;
        repairedFields.push(`days[${di}].items.empty`);
      }
    }
  }

  /* ── Merge insider tips into notes array (matches existing data shape) ──── */
  for (const day of itinerary.days) {
    const dayWithTip = day as GeneratedItinerary["days"][number] & { theme?: string; insiderTip?: string };
    if (dayWithTip.theme) {
      day.notes = [`Theme: ${dayWithTip.theme}`, ...day.notes];
    }
    if (dayWithTip.insiderTip) {
      day.notes = [...day.notes, `Insider Tip: ${dayWithTip.insiderTip}`];
    }
  }

  const aiAccepted = issues.length === 0;

  return {
    itinerary,
    validationIssues: issues,
    aiOutputAccepted: aiAccepted,
    repairedFields,
  };
}
