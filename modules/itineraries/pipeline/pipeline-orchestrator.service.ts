/**
 * Pipeline Orchestrator — runs all 6 stages in sequence.
 *
 *   Stage 1: Preference Collection (instant — already validated by Zod)
 *   Stage 2: Context Data Collection (parallel external API calls)
 *   Stage 3: Prompt Construction (deterministic plan + structured prompt)
 *   Stage 4: AI Model Processing (OpenRouter / OpenAI)
 *   Stage 5: Post-Processing & Validation (Zod + repair pipeline)
 *   Stage 6: Structured Output (DB save + final result)
 *
 * Emits progress events via callbacks so the SSE route can stream them.
 */
import type { ItineraryRequest } from "@/types/travel";
import type {
  PipelineResult,
  PipelineStage,
  PipelineStageEvent,
  StageStatus,
  ContextData,
} from "./pipeline.types";
import { collectContextData } from "./context-collector.service";
import { buildItineraryPrompt } from "./prompt-builder.service";
import { postProcessAIOutput } from "./post-processor.service";
import { generateDeterministicItinerary } from "@/modules/itineraries/planner.service";
import { createItineraryService } from "@/modules/itineraries/itinerary.service";
import { getOpenAIClient, getAIModel } from "@/modules/ai/openai-client";
import { logger } from "@/lib/observability/logger";

export interface PipelineCallbacks {
  onStageUpdate: (event: PipelineStageEvent) => void;
}

interface PipelineOptions {
  userId?: string;
  transportMode?: "car" | "bus" | "flight";
}

const PIPELINE_STAGES: PipelineStage[] = [
  "preference_collection",
  "context_collection",
  "prompt_construction",
  "ai_processing",
  "post_processing",
  "structured_output",
];

function createTimings(): Record<PipelineStage, { status: StageStatus; durationMs: number }> {
  const timings = {} as Record<PipelineStage, { status: StageStatus; durationMs: number }>;
  for (const stage of PIPELINE_STAGES) {
    timings[stage] = { status: "pending", durationMs: 0 };
  }
  return timings;
}

/* ── Stage 4: Call AI model ──────────────────────────────────────────────── */
async function callAIModel(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ rawText: string; model: string; tokensUsed: number }> {
  const client = getOpenAIClient();
  const envModel = getAIModel();
  const model = client?.baseURL.includes("openrouter") ? "google/gemini-2.0-flash-001" : (envModel ?? "gpt-4.1-mini");

  if (!client || !model) {
    return { rawText: "", model: "none", tokensUsed: 0 };
  }

  const response = await client.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 4000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const rawText = response.choices[0]?.message?.content ?? "";
  const tokensUsed = response.usage?.total_tokens ?? 0;

  return { rawText, model, tokensUsed };
}

/* ── Pipeline Orchestrator ───────────────────────────────────────────────── */
export async function runItineraryPipeline(
  request: ItineraryRequest,
  callbacks: PipelineCallbacks,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  const timings = createTimings();

  function emitStage(stage: PipelineStage, status: StageStatus, meta?: Record<string, unknown>): void {
    const event: PipelineStageEvent = { stage, status, meta };
    if (status === "completed" || status === "failed") {
      event.durationMs = Date.now() - stageStart;
      timings[stage] = { status, durationMs: event.durationMs ?? 0 };
    } else {
      timings[stage] = { status, durationMs: 0 };
    }
    callbacks.onStageUpdate(event);
  }

  let stageStart = Date.now();

  /* ── Stage 1: Preference Collection ────────────────────────────────────── */
  stageStart = Date.now();
  emitStage("preference_collection", "running");
  // Request is already Zod-validated by the route handler
  emitStage("preference_collection", "completed", {
    destinations: request.destinations,
    travelers: request.travelers,
    budgetLevel: request.budgetLevel,
  });

  /* ── Stage 2: Context Data Collection ──────────────────────────────────── */
  stageStart = Date.now();
  emitStage("context_collection", "running");
  let contextData: ContextData;
  try {
    contextData = await collectContextData(request, options.transportMode);
    const citiesWithLiveWeather = Object.values(contextData.weather)
      .filter((w) => w.source === "openweathermap")
      .length;
    emitStage("context_collection", "completed", {
      citiesWithLiveWeather,
      transportLegsCount: contextData.transportLegs.length,
      currencySource: contextData.currency.source,
    });
  } catch (error) {
    logger.error("Pipeline Stage 2 failed", { error });
    emitStage("context_collection", "failed");
    // Provide fallback context so pipeline can continue
    contextData = {
      collectedAt: new Date().toISOString(),
      weather: {},
      currency: { eurToTry: 38, usdToTry: 34, asOf: new Date().toISOString(), source: "fallback" },
      transportLegs: [],
    };
  }

  /* ── Stage 3: Prompt Construction ──────────────────────────────────────── */
  stageStart = Date.now();
  emitStage("prompt_construction", "running");
  const deterministicPlan = await generateDeterministicItinerary(request);
  const { systemPrompt, userPrompt, estimatedTokens } = buildItineraryPrompt(
    request,
    deterministicPlan,
    contextData,
  );
  emitStage("prompt_construction", "completed", {
    promptTokenEstimate: estimatedTokens,
    deterministicDays: deterministicPlan.days.length,
    deterministicActivities: deterministicPlan.days.reduce((s, d) => s + d.items.length, 0),
  });

  /* ── Stage 4: AI Model Processing ──────────────────────────────────────── */
  stageStart = Date.now();
  emitStage("ai_processing", "running");
  let rawAiOutput = "";
  let aiModel = "none";
  let tokensUsed = 0;

  try {
    const aiResult = await callAIModel(systemPrompt, userPrompt);
    rawAiOutput = aiResult.rawText;
    aiModel = aiResult.model;
    tokensUsed = aiResult.tokensUsed;
    emitStage("ai_processing", "completed", {
      modelUsed: aiModel,
      tokensUsed,
      outputLength: rawAiOutput.length,
    });
  } catch (error) {
    logger.error("Pipeline Stage 4: AI call failed", { error });
    emitStage("ai_processing", "failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  /* ── Stage 5: Post-Processing & Validation ─────────────────────────────── */
  stageStart = Date.now();
  emitStage("post_processing", "running");
  const postResult = rawAiOutput
    ? postProcessAIOutput(rawAiOutput, request, deterministicPlan)
    : {
        itinerary: deterministicPlan,
        validationIssues: [] as const,
        aiOutputAccepted: false,
        repairedFields: [] as string[],
      };

  const source = postResult.aiOutputAccepted
    ? "ai_primary" as const
    : postResult.repairedFields.length > 0
      ? "ai_repaired" as const
      : "deterministic_fallback" as const;

  emitStage("post_processing", "completed", {
    aiOutputAccepted: postResult.aiOutputAccepted,
    validationIssues: postResult.validationIssues,
    repairedFields: postResult.repairedFields.length,
    source,
  });

  /* ── Stage 6: Structured Output ────────────────────────────────────────── */
  stageStart = Date.now();
  emitStage("structured_output", "running");
  let savedId: string | null = null;

  if (options.userId) {
    try {
      const saved = await createItineraryService({
        userId: options.userId,
        requestSnapshot: request,
        generatedPlan: postResult.itinerary,
        notes: `Generated via AI pipeline (${source})`,
        status: "saved",
      });
      savedId = saved.id;
    } catch (saveError) {
      logger.error("Pipeline Stage 6: DB save failed", { error: saveError });
    }
  }

  emitStage("structured_output", "completed", {
    savedId,
    savedToDb: savedId !== null,
  });

  /* ── Assemble final result ─────────────────────────────────────────────── */
  const totalDurationMs = Date.now() - pipelineStart;

  return {
    request,
    itinerary: postResult.itinerary,
    contextData,
    pipelineMetadata: {
      stages: timings,
      totalDurationMs,
      aiOutputAccepted: postResult.aiOutputAccepted,
      validationIssues: [...postResult.validationIssues],
      source,
    },
    savedId,
  };
}
