import type { GeneratedItinerary, ItineraryRequest } from "@/types/travel";

/* ── Stage identifiers ───────────────────────────────────────────────────── */
export type PipelineStage =
  | "preference_collection"
  | "context_collection"
  | "prompt_construction"
  | "ai_processing"
  | "post_processing"
  | "structured_output";

export type StageStatus = "pending" | "running" | "completed" | "failed";

export interface PipelineStageEvent {
  stage: PipelineStage;
  status: StageStatus;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

/* ── Stage 2 output — Context Data ───────────────────────────────────────── */
export interface CityWeatherSummary {
  city: string;
  temperatureC: number;
  description: string;
  humidity: number;
  windKph: number;
  icon?: string;
  source: "openweathermap" | "fallback";
}

export interface CurrencySummary {
  eurToTry: number;
  usdToTry: number;
  asOf: string;
  source: "exchangerate-api" | "fallback";
}

export interface TransportLeg {
  from: string;
  to: string;
  mode: "car" | "bus" | "flight";
  distanceKm: number;
  estimatedDurationHours: number;
  recommendation: string;
  source: "google-distance-matrix" | "heuristic";
}

export interface ContextData {
  collectedAt: string;
  weather: Record<string, CityWeatherSummary>;
  currency: CurrencySummary;
  transportLegs: TransportLeg[];
}

/* ── Stage 5 output — Post-Processor result ──────────────────────────────── */
export type ValidationIssue =
  | "day_count_mismatch"
  | "missing_destinations"
  | "malformed_json"
  | "empty_days"
  | "cost_negative"
  | "schema_invalid"
  | "attraction_id_invalid";

export interface PostProcessorResult {
  itinerary: GeneratedItinerary;
  validationIssues: ValidationIssue[];
  aiOutputAccepted: boolean;
  repairedFields: string[];
}

/* ── Final pipeline result ───────────────────────────────────────────────── */
export interface PipelineResult {
  request: ItineraryRequest;
  itinerary: GeneratedItinerary;
  contextData: ContextData;
  pipelineMetadata: {
    stages: Record<PipelineStage, { status: StageStatus; durationMs: number }>;
    totalDurationMs: number;
    aiOutputAccepted: boolean;
    validationIssues: ValidationIssue[];
    source: "ai_primary" | "ai_repaired" | "deterministic_fallback";
  };
  savedId: string | null;
}

/* ── SSE stream event envelope ───────────────────────────────────────────── */
export type PipelineStreamEvent =
  | { type: "stage_update"; payload: PipelineStageEvent }
  | { type: "result"; payload: PipelineResult }
  | { type: "error"; payload: { message: string; code: string } };
