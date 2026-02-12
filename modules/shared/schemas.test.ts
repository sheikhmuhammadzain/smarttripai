import { describe, expect, it } from "vitest";
import {
  itineraryRequestSchema,
  transportQuerySchema,
  weatherQuerySchema,
} from "./schemas";

describe("shared schemas", () => {
  it("accepts valid itinerary requests", () => {
    const parsed = itineraryRequestSchema.parse({
      destinations: ["istanbul"],
      startDate: "2026-03-10",
      endDate: "2026-03-13",
      budgetLevel: "standard",
      interests: ["culture", "food"],
      travelers: 2,
      pace: "balanced",
    });

    expect(parsed.destinations).toEqual(["istanbul"]);
    expect(parsed.travelers).toBe(2);
  });

  it("rejects invalid itinerary dates", () => {
    expect(() =>
      itineraryRequestSchema.parse({
        destinations: ["istanbul"],
        startDate: "bad-date",
        endDate: "2026-03-13",
        budgetLevel: "standard",
        interests: ["culture"],
        travelers: 1,
        pace: "balanced",
      }),
    ).toThrow();
  });

  it("parses transport and weather query schema inputs", () => {
    const transport = transportQuerySchema.parse({
      from: "Istanbul",
      to: "Ankara",
      mode: "bus",
    });
    const weather = weatherQuerySchema.parse({ city: "Istanbul" });

    expect(transport.mode).toBe("bus");
    expect(weather.city).toBe("Istanbul");
  });
});
