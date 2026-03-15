import type { GeneratedItinerary, ItineraryRequest } from "@/types/travel";
import { getAIModel, getOpenAIClient } from "@/modules/ai/openai-client";
import { logger } from "@/lib/observability/logger";

// Compact shape the AI returns — only the fields we want it to improve
interface EnhancedItem {
  itemIndex: number;
  transport_hint?: string;
}
interface EnhancedItem {
  itemIndex: number;
  transport_hint?: string;
}
interface EnhancedDay {
  dayIndex: number;
  theme?: string;
  notes?: string[];
  insider_tip?: string;
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
    if (eDay.theme) {
      day.notes = [`Theme: ${eDay.theme}`, ...(day.notes ?? [])];
    }
    if (Array.isArray(eDay.notes) && eDay.notes.length > 0) {
      day.notes = [...(day.notes ?? []), ...eDay.notes];
    }
    if (eDay.insider_tip) {
      day.notes = [...(day.notes ?? []), `Insider Tip: ${eDay.insider_tip}`];
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
  const envModel = getAIModel();
  // Override to requested model if we are using openrouter
  const model = client?.baseURL.includes("openrouter") ? "z-ai/glm-5" : envModel;
  
  if (!client || !model) return deterministicPlan;

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.7,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: [
            "You are an elite, professional luxury travel concierge specializing in Turkey.",
            "You are enhancing a bare-bones itinerary with rich, engaging, and highly practical details.",
            "For each day, provide:",
            "1. 'theme': A catchy, premium title for the day (e.g., 'Ottoman Grandeur & Local Flavors').",
            "2. 'notes': Array of 1-3 sentences with professional advice about pacing, what to wear, or cultural etiquette.",
            "3. 'insider_tip': One highly specific, actionable secret tip (e.g., 'Grab a simit from the red carts near the ferry before the crowds arrive').",
            "For each item/attraction, provide:",
            "1. 'transport_hint': Detailed, professional directions to the next stop (e.g., '15-min scenic walk along the Bosphorus' or 'Take the pure-electric T1 Tram towards Kabatas').",
            "Respond ONLY with a valid JSON array matching this structure:",
            "[{ \"dayIndex\": 0, \"theme\": \"...\", \"notes\": [\"...\"], \"insider_tip\": \"...\", \"items\": [{ \"itemIndex\": 0, \"transport_hint\": \"...\" }] }]",
            "Do not use markdown blocks, explanations, or extra keys. Just the raw JSON array.",
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
