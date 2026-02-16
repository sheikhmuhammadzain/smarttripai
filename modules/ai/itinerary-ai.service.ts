import type { GeneratedItinerary, ItineraryRequest } from "@/types/travel";
import { getAIModel, getOpenAIClient } from "@/modules/ai/openai-client";
import { logger } from "@/lib/observability/logger";

function extractJsonFromText(value: string): string | null {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return value.slice(start, end + 1);
}

export async function enhanceItineraryWithAI(
  request: ItineraryRequest,
  deterministicPlan: GeneratedItinerary,
): Promise<GeneratedItinerary> {
  const client = getOpenAIClient();
  const model = getAIModel();
  if (!client || !model) {
    return deterministicPlan;
  }

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            "You are a travel planner for Turkey. Improve itinerary notes and transport hints only. Keep structure unchanged and return valid JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            request,
            itinerary: deterministicPlan,
          }),
        },
      ],
    });

    const outputText = response.choices[0]?.message?.content;
    if (!outputText) {
      return deterministicPlan;
    }

    const extracted = extractJsonFromText(outputText);
    if (!extracted) {
      return deterministicPlan;
    }

    const parsed = JSON.parse(extracted) as GeneratedItinerary;
    if (!parsed?.days || !Array.isArray(parsed.days)) {
      return deterministicPlan;
    }

    return parsed;
  } catch (error) {
    logger.warn("AI itinerary enhancement failed, falling back to deterministic output", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return deterministicPlan;
  }
}
