/**
 * POST /api/v1/itineraries/generate/stream
 *
 * SSE streaming endpoint for the 6-stage AI itinerary pipeline.
 * Streams real-time stage progress events to the client, then the final result.
 *
 * Event format (Server-Sent Events):
 *   data: {"type":"stage_update","payload":{...}}
 *   data: {"type":"result","payload":{...}}
 *   data: {"type":"error","payload":{...}}
 */
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit/memory-rate-limit";
import { getAuthSession } from "@/lib/auth/get-session";
import { itineraryRequestSchema } from "@/modules/shared/schemas";
import { runItineraryPipeline } from "@/modules/itineraries/pipeline/pipeline-orchestrator.service";
import type { PipelineStreamEvent } from "@/modules/itineraries/pipeline/pipeline.types";
import { logger } from "@/lib/observability/logger";

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "anonymous";
  return `generate-stream:${forwardedFor.split(",")[0].trim()}`;
}

export async function POST(request: Request): Promise<Response> {
  /* ── Rate limiting ─────────────────────────────────────────────────────── */
  const rateLimit = checkRateLimit({
    key: getClientKey(request),
    limit: 25,
    windowMs: 1000 * 60 * 15,
  });

  if (!rateLimit.allowed) {
    const errorEvent: PipelineStreamEvent = {
      type: "error",
      payload: { message: "Too many requests. Please retry later.", code: "RATE_LIMITED" },
    };
    return new Response(`data: ${JSON.stringify(errorEvent)}\n\n`, {
      status: 429,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  /* ── Parse & validate request body ─────────────────────────────────────── */
  let body: z.infer<typeof itineraryRequestSchema>;
  let transportMode: "car" | "bus" | "flight" = "bus";

  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    body = itineraryRequestSchema.parse(rawBody);
    if (rawBody.transportMode === "car" || rawBody.transportMode === "bus" || rawBody.transportMode === "flight") {
      transportMode = rawBody.transportMode;
    }
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      : "Invalid request body";
    const errorEvent: PipelineStreamEvent = {
      type: "error",
      payload: { message, code: "VALIDATION_ERROR" },
    };
    return new Response(`data: ${JSON.stringify(errorEvent)}\n\n`, {
      status: 400,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  /* ── Auth session (optional — pipeline works without auth) ─────────────── */
  const session = await getAuthSession();
  const userId = session?.user?.id ?? undefined;

  /* ── Create SSE stream ─────────────────────────────────────────────────── */
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: PipelineStreamEvent): void {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Controller already closed — ignore
        }
      }

      try {
        const result = await runItineraryPipeline(body, {
          onStageUpdate: (stageEvent) => {
            emit({ type: "stage_update", payload: stageEvent });
          },
        }, {
          userId,
          transportMode,
        });

        logger.info("Pipeline completed", {
          destinations: body.destinations,
          totalDurationMs: result.pipelineMetadata.totalDurationMs,
          source: result.pipelineMetadata.source,
          aiAccepted: result.pipelineMetadata.aiOutputAccepted,
        });

        emit({ type: "result", payload: result });
      } catch (error) {
        logger.error("Pipeline failed", { error });
        emit({
          type: "error",
          payload: {
            message: error instanceof Error ? error.message : "Pipeline failed unexpectedly",
            code: "PIPELINE_ERROR",
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
