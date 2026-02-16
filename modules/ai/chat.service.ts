import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { logger } from "@/lib/observability/logger";
import { ChatSessionModel } from "@/modules/ai/chat-session.model";
import { getAIModel, getOpenAIClient } from "@/modules/ai/openai-client";

interface ChatInput {
  userId: string;
  sessionId: string;
  message: string;
  itineraryId?: string;
}

function fallbackAssistantReply(message: string) {
  return `I can help with Turkey trip planning. You asked: "${message}". I recommend sharing destination, days, and budget for a tailored plan.`;
}

export async function chatWithAssistant(input: ChatInput) {
  await connectToDatabase();

  const userObjectId = new Types.ObjectId(input.userId);
  const existing = await ChatSessionModel.findOne({
    userId: userObjectId,
    sessionId: input.sessionId,
  });

  const messages = existing?.messages ?? [];
  messages.push({ role: "user", content: input.message, createdAt: new Date() });

  const client = getOpenAIClient();
  const model = getAIModel();
  let assistantReply = fallbackAssistantReply(input.message);

  if (client && model) {
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "You are a concise Turkey travel assistant. Provide practical recommendations and ask one follow-up question.",
          },
          ...messages.slice(-8).map((msg: { role: "user" | "assistant"; content: string }) => ({
            role: msg.role,
            content: msg.content,
          })),
        ],
      });

      const outputText = response.choices[0]?.message?.content;
      if (outputText?.trim()) {
        assistantReply = outputText.trim();
      }
    } catch (error) {
      logger.warn("Assistant OpenAI call failed, using fallback response", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  messages.push({ role: "assistant", content: assistantReply, createdAt: new Date() });

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
    reply: assistantReply,
    suggestions: [
      "Refine itinerary by city",
      "Adjust budget assumptions",
      "Add weather-aware suggestions",
    ],
  };
}
