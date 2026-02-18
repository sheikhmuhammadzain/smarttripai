import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit/memory-rate-limit";
import { chatWithAssistantStream } from "@/modules/ai/chat.service";
import { requireUserId } from "@/modules/auth/guards";
import { ApiError, fromUnknownError, fromZodError } from "@/modules/shared/problem";
import { chatRequestSchema } from "@/modules/shared/schemas";
import { problemResponse } from "@/modules/shared/response";

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "anonymous";
  return `chat-stream:${forwardedFor.split(",")[0].trim()}`;
}

function sseEncode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const instance = new URL(request.url).pathname;

  try {
    const userId = await requireUserId();

    const rateLimit = checkRateLimit({
      key: getClientKey(request),
      limit: 60,
      windowMs: 1000 * 60 * 15,
    });

    if (!rateLimit.allowed) {
      throw new ApiError(429, "RATE_LIMITED", "Too many chat messages. Please retry later.", {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    const body = chatRequestSchema.parse(await request.json());
    const encoder = new TextEncoder();
    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => {
      abortController.abort();
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(sseEncode(event, data)));
        };

        void (async () => {
          try {
            send("start", { sessionId: body.sessionId });

            const result = await chatWithAssistantStream(
              {
                userId,
                sessionId: body.sessionId,
                message: body.message,
                itineraryId: body.itineraryId,
              },
              async (delta) => {
                send("token", { delta });
              },
              { signal: abortController.signal },
            );

            send("done", result);
          } catch (error) {
            send("error", {
              message: error instanceof Error ? error.message : "Assistant stream failed",
            });
          } finally {
            controller.close();
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return problemResponse(fromZodError(error, instance));
    }
    if (error instanceof SyntaxError) {
      return problemResponse(fromUnknownError(new ApiError(400, "INVALID_JSON", "Malformed JSON body"), instance));
    }
    return problemResponse(fromUnknownError(error, instance));
  }
}
