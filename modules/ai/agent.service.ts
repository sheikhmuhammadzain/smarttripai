import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { logger } from "@/lib/observability/logger";
import { getOpenAIClient } from "@/modules/ai/openai-client";
import { agentTools, TOOL_LABELS } from "@/modules/ai/tools/definitions";
import { executeTool, getToolResultSummary, type ToolContext } from "@/modules/ai/tools/executor";

const MAX_TOOL_ITERATIONS = 4;
// Keep history short to reduce prompt tokens → lower latency
const MAX_HISTORY_TURNS = 16;
// Compact tool result payloads to avoid blowing the context window
const MAX_TOOL_RESULT_CHARS = 4000;

export interface AgentStreamCallbacks {
  onToolCall: (name: string, label: string, args: unknown) => void | Promise<void>;
  onToolResult: (name: string, summary: string) => void | Promise<void>;
  onToken: (delta: string) => void | Promise<void>;
}

function getAgentModel(): string | null {
  return process.env.AGENT_MODEL || process.env.OPENROUTER_MODEL || null;
}

function buildSystemPrompt(ctx: ToolContext): string {
  const today = new Date().toISOString().split("T")[0];
  const signedIn = Boolean(ctx.userId);
  return [
    "You are a professional Turkey travel assistant for Smart Trip AI.",
    `Today: ${today}.`,
    "STRICT SCOPE: You are designed exclusively to help with travel planning in Turkey.",
    "If the user asks about anything unrelated to Turkey travel (e.g. coding, politics, general knowledge, other countries, personal advice), politely decline and redirect:",
    'Say: "I\'m designed to help with travel planning in Turkey. Please ask about destinations, tours, itineraries, transport, or travel tips."',
    "Only answer questions about: Turkish destinations, tours, activities, attractions, itineraries, transport between Turkish cities, weather in Turkey, Turkish culture/food/safety tips, bookings on this platform.",
    "Always call tools for real data — never invent product IDs, prices, or availability.",

    // Product & discovery
    "Tours/activities → search_products (can filter by location, category, max_price).",
    "Product details → get_product_details. Slot availability → check_product_availability.",

    // Attractions
    "Landmarks/museums/sites → search_attractions or get_attraction_details (by slug).",

    // Itinerary
    "Day-by-day plan → generate_itinerary, then offer to save_itinerary.",
    signedIn
      ? "User is signed in — save_itinerary, list_itineraries, get_itinerary, update_itinerary, delete_itinerary are all available."
      : "User is NOT signed in — itinerary CRUD (save/list/get/update/delete) tools will return an auth error.",

    // Info
    "Currency conversion → get_exchange_rate. Travel tips / city guides / food / safety → get_turkey_travel_info.",
    "Current weather in a city → get_weather. How to travel between cities → get_transport_info.",

    // User account (signed in only)
    signedIn
      ? "Wishlist → get_wishlist or toggle_wishlist. User profile → get_user_profile. Preferences → get_user_preferences / update_user_preferences. Past bookings → list_orders. Accept feedback → submit_feedback."
      : "Wishlist, profile, preferences, orders, and feedback tools require the user to sign in.",

    "Be concise, use markdown. Synthesize tool results into a clear, friendly answer. Never expose raw JSON to the user.",
  ].join(" ");
}

function truncateToolResult(json: string): string {
  if (json.length <= MAX_TOOL_RESULT_CHARS) return json;
  // Truncate and note it was trimmed
  return json.slice(0, MAX_TOOL_RESULT_CHARS) + '..."(truncated)"}';
}

interface PartialToolCall {
  id: string;
  name: string;
  arguments: string;
  signalled: boolean;
}

export async function runAgentStream(
  conversationMessages: Array<{ role: "user" | "assistant"; content: string }>,
  context: ToolContext,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal,
): Promise<string> {
  const client = getOpenAIClient();
  const model = getAgentModel();

  if (!client || !model) {
    const msg = "I am unable to connect to the AI service right now. Please check your API configuration.";
    await callbacks.onToken(msg);
    return msg;
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(context) },
    ...conversationMessages.slice(-MAX_HISTORY_TURNS).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // Phase 1: Streaming tool-call loop
  // Streaming Phase 1 means onToolCall fires the moment the LLM names a tool,
  // before arguments are fully generated — lower perceived latency.
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    if (signal?.aborted) break;

    const partials = new Map<number, PartialToolCall>();
    let finishReason = "";

    try {
      const streamResp = await client.chat.completions.create({
        model,
        messages,
        tools: agentTools,
        tool_choice: "auto",
        temperature: 0.2,
        max_tokens: 1000,
        stream: true,
      });

      for await (const chunk of streamResp) {
        if (signal?.aborted) break;

        const choice = chunk.choices[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;

        for (const tcDelta of choice.delta.tool_calls ?? []) {
          const idx = tcDelta.index;

          if (!partials.has(idx)) {
            // First chunk for this index — tool name is fully present in the first delta
            const toolName = tcDelta.function?.name ?? "";
            partials.set(idx, {
              id: tcDelta.id ?? "",
              name: toolName,
              arguments: tcDelta.function?.arguments ?? "",
              signalled: false,
            });
            // Fire UI event immediately — we know the tool name
            if (toolName) {
              const label = TOOL_LABELS[toolName] ?? `Running ${toolName}...`;
              await callbacks.onToolCall(toolName, label, {});
              partials.get(idx)!.signalled = true;
            }
          } else {
            const p = partials.get(idx)!;
            if (tcDelta.id) p.id = tcDelta.id;
            if (tcDelta.function?.name) p.name += tcDelta.function.name;
            if (tcDelta.function?.arguments) p.arguments += tcDelta.function.arguments;
            // Signal if name just became available
            if (!p.signalled && p.name) {
              const label = TOOL_LABELS[p.name] ?? `Running ${p.name}...`;
              await callbacks.onToolCall(p.name, label, {});
              p.signalled = true;
            }
          }
        }
      }
    } catch (error) {
      logger.warn("Agent tool-loop streaming failed", {
        error: error instanceof Error ? error.message : "unknown",
        iteration: i,
      });
      break;
    }

    if (finishReason !== "tool_calls" || partials.size === 0) break;

    // Push the assistant message (tool_calls block) to the context
    messages.push({
      role: "assistant",
      content: null,
      tool_calls: Array.from(partials.values()).map((p) => ({
        id: p.id,
        type: "function" as const,
        function: { name: p.name, arguments: p.arguments },
      })),
    } as ChatCompletionMessageParam);

    // Execute all collected tools concurrently, then push results
    await Promise.all(
      Array.from(partials.values()).map(async (p) => {
        if (signal?.aborted) return;

        let parsedArgs: unknown = {};
        try { parsedArgs = JSON.parse(p.arguments); } catch { /* leave as {} */ }

        const rawResult = await executeTool(p.name, parsedArgs, context);
        const resultJson = truncateToolResult(rawResult);
        const summary = getToolResultSummary(p.name, resultJson);

        await callbacks.onToolResult(p.name, summary);

        messages.push({ role: "tool", tool_call_id: p.id, content: resultJson });
      }),
    );
  }

  if (signal?.aborted) return "";

  // Phase 2: Stream the final answer
  let fullReply = "";
  try {
    const streamResponse = await client.chat.completions.create({
      model,
      messages,
      tool_choice: "none", // Force text answer, no more tool calls
      temperature: 0.3,
      max_tokens: 2500,
      stream: true,
    });

    for await (const chunk of streamResponse) {
      if (signal?.aborted) break;
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullReply += delta;
        await callbacks.onToken(delta);
      }
    }
  } catch (error) {
    logger.warn("Agent final streaming failed, falling back to non-streaming", {
      error: error instanceof Error ? error.message : "unknown",
    });
    try {
      const fallback = await client.chat.completions.create({
        model,
        messages,
        tool_choice: "none",
        temperature: 0.3,
        max_tokens: 2500,
        stream: false,
      });
      fullReply = fallback.choices[0]?.message?.content ?? "";
      // Emit in small chunks to keep SSE alive
      for (const chunk of (fullReply.match(/.{1,30}(\s|$)/g) ?? [fullReply])) {
        if (signal?.aborted) break;
        await callbacks.onToken(chunk);
        await new Promise<void>((r) => setTimeout(r, 10));
      }
    } catch (inner) {
      logger.warn("Agent fallback also failed", {
        error: inner instanceof Error ? inner.message : "unknown",
      });
    }
  }

  if (!fullReply.trim()) {
    const fallback = "I was unable to generate a response. Please try rephrasing your question.";
    await callbacks.onToken(fallback);
    return fallback;
  }

  return fullReply;
}
