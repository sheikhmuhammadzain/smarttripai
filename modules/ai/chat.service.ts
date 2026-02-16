import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { logger } from "@/lib/observability/logger";
import { ChatSessionModel } from "@/modules/ai/chat-session.model";
import { getOpenRouterClient, getOpenRouterModel } from "@/modules/ai/openrouter-client";

interface ChatInput {
  userId: string;
  sessionId: string;
  message: string;
  itineraryId?: string;
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
  const trimmedMessages = messages.slice(-12);

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
  return messages.slice(-8).map((msg) => ({ role: msg.role, content: msg.content }));
}

export async function chatWithAssistant(input: ChatInput) {
  const { userObjectId, messages } = await loadConversation(input);

  const client = getOpenRouterClient();
  const model = getOpenRouterModel();
  let assistantReply = fallbackAssistantReply(input.message);

  if (client && model) {
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
      if (outputText?.trim()) {
        assistantReply = outputText.trim();
      }
    } catch (error) {
      logger.warn("Assistant OpenRouter call failed, using fallback response", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  messages.push({ role: "assistant", content: assistantReply, createdAt: new Date() });
  const persisted = await persistConversation(input, userObjectId, messages);

  return {
    sessionId: persisted.sessionId,
    reply: assistantReply,
    suggestions: persisted.suggestions,
  };
}

export async function chatWithAssistantStream(
  input: ChatInput,
  onDelta: (delta: string) => void | Promise<void>,
) {
  const { userObjectId, messages } = await loadConversation(input);

  const client = getOpenRouterClient();
  const model = getOpenRouterModel();
  let assistantReply = "";

  if (client && model) {
    try {
      const result = client.callModel({
        model,
        temperature: 0.3,
        maxOutputTokens: 500,
        instructions:
          "You are a concise Turkey travel assistant. Provide practical recommendations and ask one follow-up question.",
        input: mapToModelMessages(messages),
      });

      for await (const delta of result.getTextStream()) {
        if (!delta) continue;
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
  const persisted = await persistConversation(input, userObjectId, messages);

  return {
    sessionId: persisted.sessionId,
    reply: assistantReply,
    suggestions: persisted.suggestions,
  };
}
