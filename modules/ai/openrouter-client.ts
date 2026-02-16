import { OpenRouter } from "@openrouter/sdk";
import { getServerEnv } from "@/lib/env/server";

let cachedClient: OpenRouter | null | undefined;
let cachedModel: string | null | undefined;

export function getOpenRouterClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const env = getServerEnv();
  if (!env.OPENROUTER_API_KEY) {
    cachedClient = null;
    cachedModel = null;
    return cachedClient;
  }

  cachedClient = new OpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
    ...(env.OPENROUTER_SITE_URL ? { httpReferer: env.OPENROUTER_SITE_URL } : {}),
    ...(env.OPENROUTER_APP_NAME ? { xTitle: env.OPENROUTER_APP_NAME } : {}),
  });
  cachedModel = env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free";
  return cachedClient;
}

export function getOpenRouterModel() {
  if (cachedModel !== undefined) {
    return cachedModel;
  }

  getOpenRouterClient();
  return cachedModel ?? null;
}
