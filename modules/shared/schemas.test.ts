import { describe, expect, it } from "vitest";
import {
  itineraryRequestSchema,
  transportQuerySchema,
  userPasswordPatchSchema,
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
      departureAt: "2026-03-10T09:00:00.000Z",
    });
    const weather = weatherQuerySchema.parse({ city: "Istanbul" });

    expect(transport.mode).toBe("bus");
    expect(transport.departureAt).toBe("2026-03-10T09:00:00.000Z");
    expect(weather.city).toBe("Istanbul");
  });

  it("supports multi-destination itineraries", () => {
    const parsed = itineraryRequestSchema.parse({
      destinations: ["istanbul", "cappadocia", "antalya"],
      startDate: "2026-04-01",
      endDate: "2026-04-08",
      budgetLevel: "standard",
      interests: ["culture"],
      travelers: 1,
      pace: "balanced",
    });

    expect(parsed.destinations).toHaveLength(3);
  });

  it("enforces strong password policy for account password changes", () => {
    expect(() =>
      userPasswordPatchSchema.parse({
        currentPassword: "OldPass123!",
        newPassword: "weakpass",
        confirmPassword: "weakpass",
      }),
    ).toThrow();

    const parsed = userPasswordPatchSchema.parse({
      currentPassword: "OldPass123!",
      newPassword: "NewStrong123!",
      confirmPassword: "NewStrong123!",
    });

    expect(parsed.newPassword).toBe("NewStrong123!");
  });
});
