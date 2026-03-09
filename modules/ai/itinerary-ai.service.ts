import type { GeneratedItinerary, ItineraryRequest } from "@/types/travel";
import { getAIModel, getOpenAIClient } from "@/modules/ai/openai-client";
import { logger } from "@/lib/observability/logger";

// Compact shape the AI returns — only the fields we want it to improve
interface EnhancedItem {
  itemIndex: number;
  transport_hint?: string;
}
interface EnhancedDay {
  dayIndex: number;
  notes?: string[];
  items?: EnhancedItem[];
}

/** Build a minimal summary so the AI doesn't need to re-emit everything */
function buildMinimalSummary(plan: GeneratedItinerary, request: ItineraryRequest): string {
  return JSON.stringify({
    destinations: request.destinations,
    budgetLevel: request.budgetLevel,
    interests: request.interests,
    days: plan.days.map((d, di) => ({
      dayIndex: di,
      city: d.city,
      items: d.items.map((item, ii) => ({
        itemIndex: ii,
        attractionId: item.attractionId,
        startTime: item.startTime,
        endTime: item.endTime,
      })),
    })),
  });
}

function mergeEnhancements(plan: GeneratedItinerary, enhanced: EnhancedDay[]): GeneratedItinerary {
  const merged = structuredClone(plan) as GeneratedItinerary;
  for (const eDay of enhanced) {
    const day = merged.days[eDay.dayIndex];
    if (!day) continue;
    if (Array.isArray(eDay.notes) && eDay.notes.length > 0) {
      day.notes = eDay.notes;
    }
    for (const eItem of eDay.items ?? []) {
      const item = day.items[eItem.itemIndex];
      if (!item) continue;
      if (eItem.transport_hint) item.transportHint = eItem.transport_hint;
    }
  }
  return merged;
}

function extractJsonArray(text: string): unknown[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function enhanceItineraryWithAI(
  request: ItineraryRequest,
  deterministicPlan: GeneratedItinerary,
): Promise<GeneratedItinerary> {
  const client = getOpenAIClient();
  const model = getAIModel();
  if (!client || !model) return deterministicPlan;

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.3,
      // Only returning compact notes + transport hints, not the full plan → fits in 1200 tokens
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: [
            "You are a Turkey travel writer. For each day, write 1-2 short notes (strings) about highlights or tips.",
            "For each item, provide a brief transport_hint if travel between stops is needed.",
            "Return ONLY a valid JSON array: [{dayIndex,notes:string[],items:[{itemIndex,transport_hint}]}].",
            "No markdown, no extra keys, no explanations — just the array.",
          ].join(" "),
        },
        {
          role: "user",
          content: buildMinimalSummary(deterministicPlan, request),
        },
      ],
    });

    const outputText = response.choices[0]?.message?.content;
    if (!outputText) return deterministicPlan;

    const parsed = extractJsonArray(outputText) as EnhancedDay[] | null;
    if (!parsed) return deterministicPlan;

    return mergeEnhancements(deterministicPlan, parsed);
  } catch (error) {
    logger.warn("AI itinerary enhancement failed, falling back to deterministic output", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return deterministicPlan;
  }
}
