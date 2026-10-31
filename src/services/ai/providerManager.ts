import { getSetting, getSecureSetting } from "@/services/db/settings";
import { AiError } from "./errors";
import type { AiProvider, AiProviderClient } from "./types";
import { DEFAULT_MODELS, MODEL_SETTINGS } from "./types";

// The provider SDKs (Anthropic, OpenAI, Google) weigh several hundred KB and
// most sessions never touch AI: load each one only when it is first used.
const clearers = new Set<() => void>();

async function loadProvider(name: AiProvider) {
  switch (name) {
    case "claude": {
      const m = await import("./providers/claudeProvider");
      clearers.add(m.clearClaudeProvider);
      return m.createClaudeProvider;
    }
    case "openai": {
      const m = await import("./providers/openaiProvider");
      clearers.add(m.clearOpenAIProvider);
      return m.createOpenAIProvider;
    }
    case "gemini": {
      const m = await import("./providers/geminiProvider");
      clearers.add(m.clearGeminiProvider);
      return m.createGeminiProvider;
    }
    case "copilot": {
      const m = await import("./providers/copilotProvider");
      clearers.add(m.clearCopilotProvider);
      return m.createCopilotProvider;
    }
    case "ollama": {
      const m = await import("./providers/ollamaProvider");
      clearers.add(m.clearOllamaProvider);
      return m.createOllamaProvider;
    }
  }
}

const API_KEY_SETTINGS: Record<Exclude<AiProvider, "ollama">, string> = {
  claude: "claude_api_key",
  openai: "openai_api_key",
  gemini: "gemini_api_key",
  copilot: "copilot_api_key",
};

let cachedProvider: { name: AiProvider; key: string; client: AiProviderClient } | null = null;

export async function getActiveProviderName(): Promise<AiProvider> {
  const setting = await getSetting("ai_provider");
  if (setting === "openai" || setting === "gemini" || setting === "ollama" || setting === "copilot") return setting;
  return "claude";
}

export async function getActiveProvider(): Promise<AiProviderClient> {
  const providerName = await getActiveProviderName();

  if (providerName === "ollama") {
    const serverUrl = (await getSetting("ollama_server_url")) ?? "http://localhost:11434";
    const model = (await getSetting("ollama_model")) ?? "llama3.2";
    const cacheKey = `${serverUrl}|${model}`;

    if (cachedProvider && cachedProvider.name === "ollama" && cachedProvider.key === cacheKey) {
      return cachedProvider.client;
    }

    const client = (await loadProvider("ollama"))(serverUrl, model);
    cachedProvider = { name: "ollama", key: cacheKey, client };
    return client;
  }

  const keySetting = API_KEY_SETTINGS[providerName];
  const apiKey = await getSecureSetting(keySetting);

  if (!apiKey) {
    throw new AiError("NOT_CONFIGURED", `${providerName} API key not configured`);
  }

  const model = (await getSetting(MODEL_SETTINGS[providerName])) ?? DEFAULT_MODELS[providerName];
  const cacheKey = `${apiKey}|${model}`;

  if (cachedProvider && cachedProvider.name === providerName && cachedProvider.key === cacheKey) {
    return cachedProvider.client;
  }

  const client: AiProviderClient = (await loadProvider(providerName))(apiKey, model);

  cachedProvider = { name: providerName, key: cacheKey, client };
  return client;
}

export async function isAiAvailable(): Promise<boolean> {
  try {
    const enabled = await getSetting("ai_enabled");
    if (enabled === "false") return false;
    const providerName = await getActiveProviderName();

    if (providerName === "ollama") {
      const serverUrl = await getSetting("ollama_server_url");
      return !!serverUrl;
    }

    const keySetting = API_KEY_SETTINGS[providerName];
    const key = await getSecureSetting(keySetting);
    return !!key;
  } catch {
    return false;
  }
}

export function clearProviderClients(): void {
  cachedProvider = null;
  for (const clear of clearers) clear();
}
