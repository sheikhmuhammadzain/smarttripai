import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { logger } from "@/lib/observability/logger";
import { runChatAgent, type ChatAgentResult } from "@/modules/ai/chat-agent.service";
import { ChatSessionModel } from "@/modules/ai/chat-session.model";
import { getOpenRouterClient, getOpenRouterModel } from "@/modules/ai/openrouter-client";

interface ChatInput {
  userId: string;
  sessionId: string;
  message: string;
  itineraryId?: string;
}

export interface AssistantHistoryMessage {
  role: "assistant" | "user";
  content: string;
  createdAt: string;
}

function fallbackAssistantReply(message: string) {
  return `I can help with Turkey trip planning. You asked: "${message}". I recommend sharing destination, days, and budget for a tailored plan.`;
}

async function loadConversation(input: ChatInput) {
  await connectToDatabase();

  const userObjectId = new Types.ObjectId(input.userId);
  const existing = await ChatSessionModel.findOne({
    userId: userObjectId,
    sessionId: input.sessionId,
  });

  const messages = existing?.messages ?? [];
  messages.push({ role: "user", content: input.message, createdAt: new Date() });
  return { userObjectId, messages };
}

async function persistConversation(input: ChatInput, userObjectId: Types.ObjectId, messages: Array<{ role: "user" | "assistant"; content: string; createdAt: Date }>) {
  const trimmedMessages = messages.slice(-120);

  const saved = await ChatSessionModel.findOneAndUpdate(
    {
      userId: userObjectId,
      sessionId: input.sessionId,
    },
    {
      $set: {
        itineraryId: input.itineraryId && Types.ObjectId.isValid(input.itineraryId)
          ? new Types.ObjectId(input.itineraryId)
          : undefined,
        messages: trimmedMessages,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  return {
    sessionId: saved?.sessionId ?? input.sessionId,
    suggestions: [
      "Refine itinerary by city",
      "Adjust budget assumptions",
      "Add weather-aware suggestions",
    ],
  };
}

function mapToModelMessages(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  return messages.slice(-40).map((msg) => ({ role: msg.role, content: msg.content }));
}

export async function getAssistantSessionHistory(userId: string, sessionId: string) {
  await connectToDatabase();
  const userObjectId = new Types.ObjectId(userId);
  const session = await ChatSessionModel.findOne({ userId: userObjectId, sessionId }).lean();
  const rawMessages = (session?.messages ?? []) as Array<{
    role?: unknown;
    content?: unknown;
    createdAt?: unknown;
  }>;
  const messages = rawMessages
    .filter((msg): msg is { role: "assistant" | "user"; content: string; createdAt?: Date } =>
      (msg.role === "assistant" || msg.role === "user") && typeof msg.content === "string",
    )
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
      createdAt: (msg.createdAt ?? new Date()).toISOString(),
    })) satisfies AssistantHistoryMessage[];

  return { sessionId, messages };
}

export async function chatWithAssistant(input: ChatInput) {
  let userObjectId: Types.ObjectId | null = null;
  const fallbackMessages: Array<{ role: "user" | "assistant"; content: string; createdAt: Date }> = [
    { role: "user", content: input.message, createdAt: new Date() },
  ];
  let messages = fallbackMessages;
  let agent: ChatAgentResult | null = null;

  try {
    const loaded = await loadConversation(input);
    userObjectId = loaded.userObjectId;
    messages = loaded.messages;
  } catch (error) {
    logger.warn("Assistant conversation load failed, using ephemeral context", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  let client: ReturnType<typeof getOpenRouterClient> = null;
  let model: ReturnType<typeof getOpenRouterModel> = null;
  try {
    client = getOpenRouterClient();
    model = getOpenRouterModel();
  } catch (error) {
    logger.warn("Assistant model client init failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
  let assistantReply = fallbackAssistantReply(input.message);

  try {
    agent = await runChatAgent(input.message);
    if (agent.intent === "recommendation" || agent.intent === "booking") {
      assistantReply = agent.assistantMessage || assistantReply;
    } else if (!client || !model) {
      assistantReply = agent.assistantMessage || assistantReply;
    }
  } catch {
    // Keep default/fallback behavior.
  }

  if ((!agent || agent.intent === "general" || !assistantReply.trim()) && client && model) {
    try {
      const result = client.callModel({
        model,
        temperature: 0.3,
        maxOutputTokens: 500,
        instructions:
          "You are a concise Turkey travel assistant. Provide practical recommendations and ask one follow-up question.",
        input: mapToModelMessages(messages),
      });

      const outputText = await result.getText();
      if (outputText?.trim() && outputText.trim().length >= 20) {
        assistantReply = outputText.trim();
      } else if (agent?.assistantMessage?.trim()) {
        assistantReply = agent.assistantMessage.trim();
      }
    } catch (error) {
      logger.warn("Assistant OpenRouter call failed, using fallback response", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  messages.push({ role: "assistant", content: assistantReply, createdAt: new Date() });
  let sessionId = input.sessionId;
  let suggestions = [
    "Refine itinerary by city",
    "Adjust budget assumptions",
    "Add weather-aware suggestions",
  ];
  if (userObjectId) {
    try {
      const persisted = await persistConversation(input, userObjectId, messages);
      sessionId = persisted.sessionId;
      suggestions = persisted.suggestions;
    } catch (error) {
      logger.warn("Assistant conversation persistence failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return {
    sessionId,
    reply: assistantReply,
    suggestions,
    agent,
  };
}

export async function chatWithAssistantStream(
  input: ChatInput,
  onDelta: (delta: string) => void | Promise<void>,
  options?: { signal?: AbortSignal },
) {
  let userObjectId: Types.ObjectId | null = null;
  const fallbackMessages: Array<{ role: "user" | "assistant"; content: string; createdAt: Date }> = [
    { role: "user", content: input.message, createdAt: new Date() },
  ];
  let messages = fallbackMessages;
  let agent: ChatAgentResult | null = null;

  try {
    const loaded = await loadConversation(input);
    userObjectId = loaded.userObjectId;
    messages = loaded.messages;
  } catch (error) {
    logger.warn("Assistant stream conversation load failed, using ephemeral context", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  let client: ReturnType<typeof getOpenRouterClient> = null;
  let model: ReturnType<typeof getOpenRouterModel> = null;
  try {
    client = getOpenRouterClient();
    model = getOpenRouterModel();
  } catch (error) {
    logger.warn("Assistant stream model client init failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }
  let assistantReply = "";

  try {
    agent = await runChatAgent(input.message);
  } catch {
    // Ignore agent failure and fallback to model streaming.
  }

  if (agent?.assistantMessage && (agent.intent === "recommendation" || agent.intent === "booking")) {
    const chunks = agent.assistantMessage.match(/.{1,20}(\s|$)/g) ?? [agent.assistantMessage];
    for (const chunk of chunks) {
      if (options?.signal?.aborted) {
        break;
      }
      assistantReply += chunk;
      await onDelta(chunk);
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
  } else if (agent?.assistantMessage && (!client || !model)) {
    const chunks = agent.assistantMessage.match(/.{1,20}(\s|$)/g) ?? [agent.assistantMessage];
    for (const chunk of chunks) {
      if (options?.signal?.aborted) {
        break;
      }
      assistantReply += chunk;
      await onDelta(chunk);
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
  } else if (client && model) {
    try {
      const stream = await client.chat.send({
        chatGenerationParams: {
          model,
          stream: true,
          temperature: 0.3,
          maxTokens: 500,
          messages: [
            {
              role: "system",
              content:
                "You are a concise Turkey travel assistant. Provide practical recommendations and ask one follow-up question.",
            },
            ...mapToModelMessages(messages),
          ],
        },
      }, {
        signal: options?.signal,
      });

      for await (const chunk of stream) {
        if (options?.signal?.aborted) {
          break;
        }

        if ("error" in chunk && chunk.error) {
          throw new Error(chunk.error.message ?? "OpenRouter streaming error");
        }

        const delta = chunk.choices?.[0]?.delta?.content;
        if (!delta) {
          continue;
        }
        assistantReply += delta;
        await onDelta(delta);
      }
    } catch (error) {
      logger.warn("Assistant OpenRouter streaming failed, using fallback response", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  if (!assistantReply.trim()) {
    assistantReply = fallbackAssistantReply(input.message);
    await onDelta(assistantReply);
  }

  messages.push({ role: "assistant", content: assistantReply, createdAt: new Date() });
  let sessionId = input.sessionId;
  let suggestions = [
    "Refine itinerary by city",
    "Adjust budget assumptions",
    "Add weather-aware suggestions",
  ];
  if (userObjectId) {
    try {
      const persisted = await persistConversation(input, userObjectId, messages);
      sessionId = persisted.sessionId;
      suggestions = persisted.suggestions;
    } catch (error) {
      logger.warn("Assistant stream conversation persistence failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return {
    sessionId,
    reply: assistantReply,
    suggestions,
    agent,
  };
}
