import type { GeneratedItinerary } from "@/types/travel";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseGeneratedItinerary(value: unknown): GeneratedItinerary | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = value.title;
  const cityOrder = value.cityOrder;
  const days = value.days;
  const totalEstimatedCostTRY = value.totalEstimatedCostTRY;

  if (
    typeof title !== "string" ||
    !Array.isArray(cityOrder) ||
    !Array.isArray(days) ||
    typeof totalEstimatedCostTRY !== "number"
  ) {
    return null;
  }

  return value as unknown as GeneratedItinerary;
}

export function itineraryTitle(value: unknown, fallback = "Turkey itinerary") {
  const parsed = parseGeneratedItinerary(value);
  return parsed?.title ?? fallback;
}
