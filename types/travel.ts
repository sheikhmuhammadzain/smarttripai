export type BudgetLevel = "budget" | "standard" | "luxury";

export type InterestTag =
  | "culture"
  | "history"
  | "food"
  | "nature"
  | "adventure"
  | "relaxation";

export type TravelPace = "slow" | "balanced" | "fast";

export interface ItineraryRequest {
  destinations: string[];
  startDate: string;
  endDate: string;
  budgetLevel: BudgetLevel;
  interests: InterestTag[];
  travelers: number;
  pace: TravelPace;
}

export interface DayPlanItem {
  attractionId: string;
  attractionName?: string;
  attractionSlug?: string;
  attractionDescription?: string;
  attractionTags?: string[];
  avgDurationMin?: number;
  startTime: string;
  endTime: string;
  costEstimateTRY: number;
  transportHint?: string;
}

export interface GeneratedItineraryDay {
  day: number;
  city: string;
  items: DayPlanItem[];
  notes: string[];
}

export interface GeneratedItinerary {
  title: string;
  cityOrder: string[];
  days: GeneratedItineraryDay[];
  totalEstimatedCostTRY: number;
}

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  [key: string]: unknown;
}
