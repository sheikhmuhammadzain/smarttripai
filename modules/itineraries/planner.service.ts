import type {
  GeneratedItinerary,
  ItineraryRequest,
  TravelPace,
} from "@/types/travel";
import { getAttractionsForPlanning } from "@/modules/attractions/attraction.repository";

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

function activitiesPerDay(pace: TravelPace) {
  if (pace === "slow") return 2;
  if (pace === "fast") return 4;
  return 3;
}

function budgetMultiplier(level: ItineraryRequest["budgetLevel"]) {
  if (level === "budget") return 0.85;
  if (level === "luxury") return 1.45;
  return 1;
}

export async function generateDeterministicItinerary(
  request: ItineraryRequest,
): Promise<GeneratedItinerary> {
  const totalDays = daysBetween(request.startDate, request.endDate);
  const perDay = activitiesPerDay(request.pace);

  const byCity = await getAttractionsForPlanning(
    request.destinations,
    request.interests,
  );

  // Fallback pool: all attractions found across every city, sorted by popularity.
  // Used when a destination has no matching attractions (e.g. city not yet seeded).
  const fallbackPool = Array.from(byCity.values())
    .flat()
    .sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));

  const days: GeneratedItinerary["days"] = [];
  let totalEstimatedCostTRY = 0;
  let fallbackOffset = 0;

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const city = request.destinations[dayIndex % request.destinations.length];
    const cityPool = byCity.get(city) ?? [];
    // If city has no attractions, draw from the global fallback pool
    const cityAttractions = cityPool.length > 0
      ? [...cityPool].slice(0, perDay)
      : fallbackPool.slice(fallbackOffset, fallbackOffset + perDay);
    if (cityPool.length === 0) fallbackOffset += perDay;

    const items = cityAttractions.map((attraction, idx) => {
      const hour = 9 + idx * 3;
      const startTime = `${String(hour).padStart(2, "0")}:00`;
      const endTime = `${String(hour + 2).padStart(2, "0")}:00`;
      const minPrice = attraction.ticketPriceRange?.min ?? 300;
      const maxPrice = attraction.ticketPriceRange?.max ?? 700;
      const baseCost = Math.round((minPrice + maxPrice) / 2);
      const adjustedCost = Math.round(
        baseCost * budgetMultiplier(request.budgetLevel) * request.travelers,
      );

      totalEstimatedCostTRY += adjustedCost;

      return {
        attractionId: attraction._id.toString(),
        attractionName: attraction.name,
        attractionSlug: attraction.slug,
        attractionDescription: attraction.description,
        attractionTags: attraction.tags,
        avgDurationMin: attraction.avgDurationMin,
        startTime,
        endTime,
        costEstimateTRY: adjustedCost,
        transportHint:
          idx === 0
            ? "Start early to avoid crowds"
            : "Use local taxi or tram for transfer",
      };
    });

    days.push({
      day: dayIndex + 1,
      city,
      items,
      notes: [
        `Best for ${request.interests.join(", ")} in ${city}`,
        "Carry cash for smaller vendors and local transport",
      ],
    });
  }

  return {
    title: `${request.destinations.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(" -> ")} ${totalDays}-day AI itinerary`,
    cityOrder: request.destinations,
    days,
    totalEstimatedCostTRY,
  };
}
