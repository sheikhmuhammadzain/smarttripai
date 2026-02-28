import { z } from "zod";
import { getTransportGuidance } from "@/modules/realtime/transport.service";
import { transportQuerySchema } from "@/modules/shared/schemas";
import { fromUnknownError, fromZodError } from "@/modules/shared/problem";
import { ok, problemResponse } from "@/modules/shared/response";

export async function GET(request: Request) {
  const instance = new URL(request.url).pathname;

  try {
    const url = new URL(request.url);
    const query = transportQuerySchema.parse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      mode: url.searchParams.get("mode") ?? "bus",
      departureAt: url.searchParams.get("departureAt") ?? undefined,
    });

    const transport = await getTransportGuidance(query.from, query.to, query.mode, query.departureAt);
    return ok(transport);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return problemResponse(fromZodError(error, instance));
    }
    return problemResponse(fromUnknownError(error, instance));
  }
}
