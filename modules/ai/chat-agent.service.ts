import { products } from "@/lib/data";
import { getServerEnv } from "@/lib/env/server";
import { logger } from "@/lib/observability/logger";

export interface AgentRecommendation {
  productId: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  rating: number;
  reason: string;
  url: string;
}

export interface AgentBookingAction {
  productId: string;
  title: string;
  quantity: number;
  estimatedTotal: number;
  currency: string;
  checkoutUrl: string;
}

export interface ChatAgentResult {
  intent: "recommendation" | "booking" | "general";
  assistantMessage: string;
  recommendations: AgentRecommendation[];
  booking: AgentBookingAction | null;
}

function isGreetingOrSmallTalk(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return true;
  const compact = normalized.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const smallTalkSet = new Set([
    "hi",
    "hello",
    "hey",
    "hii",
    "hola",
    "salam",
    "merhaba",
    "yo",
    "sup",
    "good morning",
    "good afternoon",
    "good evening",
    "how are you",
    "who are you",
    "what can you do",
  ]);
  return smallTalkSet.has(compact);
}

function fallbackGeneralAssistantMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  const compact = normalized.replace(/[^\p{L}\p{N}\s]/gu, "").trim();

  if (compact === "who are you") {
    return "I am your Turkey travel assistant. I can help you choose destinations, build day-by-day plans, suggest activities, and guide bookings.";
  }

  if (compact === "what can you do") {
    return "I can recommend Turkey experiences, build a trip itinerary by budget and interests, and help you decide what to book first.";
  }

  if (compact === "how are you") {
    return "I am ready to help you plan your Turkey trip. Tell me your destination, trip length, and budget.";
  }

  if (/\b(safe|safety|security|scam|emergency|crime)\b/.test(normalized)) {
    return "For Turkey safety: use licensed taxis/apps, keep valuables secure in crowded areas, carry passport copies, and check official local advisories before intercity travel.";
  }

  if (/\b(culture|custom|etiquette|dress|mosque|ramadan|local tips)\b/.test(normalized)) {
    return "For local etiquette in Turkey: dress modestly at mosques, remove shoes where required, greet politely, and confirm service charges before paying in tourist zones.";
  }

  return "Hi. Tell me your destination, trip length, budget, and interests, and I will create a personalized Turkey plan.";
}

function wantsRecommendations(message: string) {
  const lower = message.toLowerCase();
  return /\b(recommend|suggest|best|top|where to go|things to do|plan|itinerary|trip|tour|activity|activities)\b/.test(lower);
}

function fallbackAgentResponse(message: string): ChatAgentResult {
  const lower = message.toLowerCase();
  const wantsBooking = /\b(book|booking|reserve|buy|checkout)\b/.test(lower);
  const wantsSuggest = wantsRecommendations(message);
  const recommendations = products.slice(0, 3).map((product) => ({
    productId: product.id,
    title: product.title,
    location: product.location,
    price: product.price,
    currency: product.currency,
    rating: product.rating,
    reason: "Popular choice based on Turkey travel demand and overall ratings.",
    url: `/products/${product.id}`,
  }));

  if (wantsBooking) {
    const selected = recommendations[0];
    return {
      intent: "booking",
      assistantMessage:
        `I prepared a booking suggestion for ${selected.title}. Open the product, add quantity, then continue to checkout.`,
      recommendations,
      booking: {
        productId: selected.productId,
        title: selected.title,
        quantity: 1,
        estimatedTotal: selected.price,
        currency: selected.currency,
        checkoutUrl: `/products/${selected.productId}`,
      },
    };
  }

  if (!wantsSuggest || isGreetingOrSmallTalk(message)) {
    return {
      intent: "general",
      assistantMessage: fallbackGeneralAssistantMessage(message),
      recommendations: [],
      booking: null,
    };
  }

  return {
    intent: "recommendation",
    assistantMessage:
      "Here are top Turkey experiences matching common traveler preferences. Share city, budget, and days for tighter recommendations.",
    recommendations,
    booking: null,
  };
}

function parseModelJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function normalizeResult(raw: unknown): ChatAgentResult | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const intent = data.intent;
  const assistantMessage = data.assistantMessage;
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
  const booking = data.booking;

  if (
    (intent !== "recommendation" && intent !== "booking" && intent !== "general") ||
    typeof assistantMessage !== "string"
  ) {
    return null;
  }

  const normalizedRecommendations: AgentRecommendation[] = recommendations
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      if (
        typeof row.productId !== "string" ||
        typeof row.title !== "string" ||
        typeof row.location !== "string" ||
        typeof row.price !== "number" ||
        typeof row.currency !== "string" ||
        typeof row.rating !== "number" ||
        typeof row.reason !== "string" ||
        typeof row.url !== "string"
      ) {
        return null;
      }
      return {
        productId: row.productId,
        title: row.title,
        location: row.location,
        price: row.price,
        currency: row.currency,
        rating: row.rating,
        reason: row.reason,
        url: row.url,
      };
    })
    .filter((item): item is AgentRecommendation => Boolean(item));

  let normalizedBooking: AgentBookingAction | null = null;
  if (booking && typeof booking === "object") {
    const b = booking as Record<string, unknown>;
    if (
      typeof b.productId === "string" &&
      typeof b.title === "string" &&
      typeof b.quantity === "number" &&
      typeof b.estimatedTotal === "number" &&
      typeof b.currency === "string" &&
      typeof b.checkoutUrl === "string"
    ) {
      normalizedBooking = {
        productId: b.productId,
        title: b.title,
        quantity: b.quantity,
        estimatedTotal: b.estimatedTotal,
        currency: b.currency,
        checkoutUrl: b.checkoutUrl,
      };
    }
  }

  return {
    intent,
    assistantMessage: assistantMessage.trim(),
    recommendations: normalizedRecommendations,
    booking: normalizedBooking,
  };
}

export async function runChatAgent(message: string): Promise<ChatAgentResult> {
  const env = getServerEnv();
  if (!env.OPENROUTER_API_KEY) {
    return fallbackAgentResponse(message);
  }
  if (!env.OPENROUTER_MODEL) {
    logger.warn("OPENROUTER_MODEL is not set; using local chat-agent fallback");
    return fallbackAgentResponse(message);
  }

  try {
    const catalog = products.map((product) => ({
      id: product.id,
      title: product.title,
      location: product.location,
      price: product.price,
      currency: product.currency,
      rating: product.rating,
      url: `/products/${product.id}`,
    }));

    const requestBody = {
      model: env.OPENROUTER_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a Turkey travel chat agent. Return ONLY valid JSON. Help users with recommendations, booking guidance, local culture etiquette, and safety tips using provided product catalog.",
        },
        {
          role: "user",
          content: JSON.stringify({
            userMessage: message,
            productCatalog: catalog,
            rules: [
              "If user asks for recommendation, set intent=recommendation and include 1-3 recommendations.",
              "If user asks to book/reserve, set intent=booking and include booking action for one product.",
              "If no clear task, intent=general and answer naturally and concisely based on user message.",
            ],
          }),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "chat_agent_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              intent: { type: "string", enum: ["recommendation", "booking", "general"] },
              assistantMessage: { type: "string" },
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    productId: { type: "string" },
                    title: { type: "string" },
                    location: { type: "string" },
                    price: { type: "number" },
                    currency: { type: "string" },
                    rating: { type: "number" },
                    reason: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["productId", "title", "location", "price", "currency", "rating", "reason", "url"],
                  additionalProperties: false,
                },
              },
              booking: {
                anyOf: [
                  { type: "null" },
                  {
                    type: "object",
                    properties: {
                      productId: { type: "string" },
                      title: { type: "string" },
                      quantity: { type: "number" },
                      estimatedTotal: { type: "number" },
                      currency: { type: "string" },
                      checkoutUrl: { type: "string" },
                    },
                    required: ["productId", "title", "quantity", "estimatedTotal", "currency", "checkoutUrl"],
                    additionalProperties: false,
                  },
                ],
              },
            },
            required: ["intent", "assistantMessage", "recommendations", "booking"],
            additionalProperties: false,
          },
        },
      },
    };

    let response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "content-type": "application/json",
        ...(env.OPENROUTER_SITE_URL ? { "HTTP-Referer": env.OPENROUTER_SITE_URL } : {}),
        ...(env.OPENROUTER_APP_NAME ? { "X-Title": env.OPENROUTER_APP_NAME } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok && response.status === 400) {
      const fallbackBody = {
        model: env.OPENROUTER_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a Turkey travel chat agent. Return ONLY valid JSON object with keys: intent, assistantMessage, recommendations, booking.",
          },
          requestBody.messages[1],
        ],
      };

      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "content-type": "application/json",
          ...(env.OPENROUTER_SITE_URL ? { "HTTP-Referer": env.OPENROUTER_SITE_URL } : {}),
          ...(env.OPENROUTER_APP_NAME ? { "X-Title": env.OPENROUTER_APP_NAME } : {}),
        },
        body: JSON.stringify(fallbackBody),
      });
    }

    if (!response.ok) {
      throw new Error(`Chat agent failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseModelJson(content);
    const normalized = normalizeResult(parsed);
    if (!normalized) {
      return fallbackAgentResponse(message);
    }

    if (normalized.intent === "general") {
      return {
        ...normalized,
        recommendations: [],
        booking: null,
      };
    }

    return normalized;
  } catch (error) {
    logger.warn("Chat agent structured output failed, using fallback", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return fallbackAgentResponse(message);
  }
}
