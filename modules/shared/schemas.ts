import { z } from "zod";

export const budgetLevelSchema = z.enum(["budget", "standard", "luxury"]);
export const interestTagSchema = z.enum([
  "culture",
  "history",
  "food",
  "nature",
  "adventure",
  "relaxation",
]);
export const travelPaceSchema = z.enum(["slow", "balanced", "fast"]);

export const itineraryRequestSchema = z.object({
  destinations: z.array(z.string().trim().min(1)).min(1).max(4),
  startDate: z.string().date(),
  endDate: z.string().date(),
  budgetLevel: budgetLevelSchema,
  interests: z.array(interestTagSchema).min(1).max(4),
  travelers: z.number().int().min(1).max(10),
  pace: travelPaceSchema,
});

export const itinerarySaveSchema = z.object({
  requestSnapshot: itineraryRequestSchema,
  generatedPlan: z.unknown(),
  notes: z.string().trim().max(3000).optional(),
  status: z.enum(["draft", "saved", "archived"]).default("saved"),
});

export const itineraryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const attractionQuerySchema = z.object({
  city: z.string().trim().min(1).optional(),
  tags: z.string().trim().optional(),
  budgetLevel: budgetLevelSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const chatRequestSchema = z.object({
  sessionId: z.string().trim().min(6).max(120),
  message: z.string().trim().min(1).max(2000),
  itineraryId: z.string().trim().optional(),
});

export const weatherQuerySchema = z.object({
  city: z.string().trim().min(1),
  hours: z.coerce.number().int().min(1).max(24).default(6),
});

export const currencyQuerySchema = z.object({
  base: z.string().trim().length(3).default("USD"),
  target: z.string().trim().length(3).default("TRY"),
});

export const transportQuerySchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  mode: z.enum(["car", "bus", "flight"]).default("bus"),
});

export const userPreferencesPatchSchema = z.object({
  preferredBudget: budgetLevelSchema.optional(),
  preferredCities: z.array(z.string().trim().min(1)).max(12).optional(),
  preferredInterests: z.array(interestTagSchema).max(6).optional(),
  savedMap: z
    .object({
      centerLat: z.number().min(35).max(43),
      centerLon: z.number().min(25).max(45),
      zoom: z.number().min(3).max(12),
      highlightedCities: z.array(z.string().trim().min(1)).max(12).default([]),
    })
    .optional(),
});

export const userAccountPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,20}$/, "Invalid phone number format")
      .or(z.literal(""))
      .nullable()
      .optional(),
  })
  .refine((value) => value.name !== undefined || value.phone !== undefined, {
    message: "At least one field is required",
  });

export const userPasswordPatchSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
});

export const feedbackCreateSchema = z.object({
  email: z.string().email().optional(),
  category: z.enum(["ux", "itinerary", "assistant", "realtime", "other"]),
  message: z.string().trim().min(10).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
});
