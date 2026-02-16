import OpenAI from "openai";
import { getServerEnv } from "@/lib/env/server";

let cachedClient: OpenAI | null | undefined;
let cachedModel: string | null | undefined;

export function getOpenAIClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const env = getServerEnv();
  const hasOpenRouter = Boolean(env.OPENROUTER_API_KEY);
  const hasOpenAI = Boolean(env.OPENAI_API_KEY);

  if (!hasOpenRouter && !hasOpenAI) {
    cachedClient = null;
    cachedModel = null;
    return cachedClient;
  }

  if (hasOpenRouter) {
    cachedClient = new OpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        ...(env.OPENROUTER_SITE_URL ? { "HTTP-Referer": env.OPENROUTER_SITE_URL } : {}),
        ...(env.OPENROUTER_APP_NAME ? { "X-Title": env.OPENROUTER_APP_NAME } : {}),
      },
    });
    cachedModel = env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free";
    return cachedClient;
  }

  cachedClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  cachedModel = env.OPENAI_MODEL ?? "gpt-4.1-mini";
  return cachedClient;
}

export function getAIModel() {
  if (cachedModel !== undefined) {
    return cachedModel;
  }

  getOpenAIClient();
  return cachedModel ?? null;
}
