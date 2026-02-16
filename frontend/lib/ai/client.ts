import {
  streamText,
  generateText as sdkGenerateText,
  generateObject as sdkGenerateObject,
} from "ai";
import type { ZodType } from "zod";
import { getModel } from "./providers";
import { storage } from "@/core/storage/safe-storage";
import { AI_VENDORS, type AIConnection } from "@/lib/config/ai-vendors";
import { getAPIKey } from "@/core/storage/api-keys";

export type AIMessageRole = "system" | "user" | "assistant";

export interface AIModelMessage {
  role: AIMessageRole;
  content: string;
}

export interface GenerateOptions {
  model: string;
  messages: AIModelMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  signal?: AbortSignal;
}

export interface GenerateObjectOptions<T> {
  model: string;
  schema: ZodType<T>;
  messages: AIModelMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  signal?: AbortSignal;
}

function assertMessages(messages: AIModelMessage[]): void {
  if (!messages.length) {
    throw new Error("AI request requires at least one message.");
  }
}

/**
 * Finds the connection configuration for a given model.
 * Searches enabled connections that include the model in their models list.
 */
function requiresApiKey(connection: AIConnection): boolean {
  if (connection.provider !== "openai") {
    return AI_VENDORS[connection.provider].requiresAuth;
  }

  const endpoint =
    connection.customEndpoint?.trim() || AI_VENDORS.openai.defaultEndpoint;
  return endpoint === AI_VENDORS.openai.defaultEndpoint;
}

async function getConnection(modelId: string): Promise<AIConnection> {
  const normalizedModel = modelId.trim();
  if (!normalizedModel) {
    throw new Error("A model must be selected before using AI features.");
  }

  const connections = storage.getItem<AIConnection[]>("ai_connections", []);
  const connection = connections.find(
    (c) => c.enabled && c.models?.includes(normalizedModel),
  );

  if (!connection) {
    throw new Error(
      `No enabled AI connection supports model "${normalizedModel}". Refresh models in Settings or pick another model.`,
    );
  }

  const apiKey =
    connection.apiKey.trim() || (await getAPIKey(connection.provider)) || "";
  if (requiresApiKey(connection) && !apiKey) {
    throw new Error(
      `Missing API key for ${AI_VENDORS[connection.provider].name}. Add it in Settings.`,
    );
  }

  return { ...connection, apiKey };
}

/**
 * Generate text (non-streaming).
 * Use for one-shot generation like analysis, spark prompts, etc.
 */
export async function generate(opts: GenerateOptions) {
  assertMessages(opts.messages);
  const connection = await getConnection(opts.model);
  const model = getModel(connection, opts.model);

  // Conditionally include optional properties to satisfy exactOptionalPropertyTypes
  return sdkGenerateText({
    model,
    messages: opts.messages,
    ...(opts.maxTokens && { maxOutputTokens: opts.maxTokens }),
    ...(opts.temperature != null && { temperature: opts.temperature }),
    ...(opts.topP != null && { topP: opts.topP }),
    ...(opts.frequencyPenalty != null && {
      frequencyPenalty: opts.frequencyPenalty,
    }),
    ...(opts.presencePenalty != null && {
      presencePenalty: opts.presencePenalty,
    }),
    ...(opts.signal && { abortSignal: opts.signal }),
  });
}

/**
 * Stream text with real-time chunks.
 * Use for chat, rewrites, and interactive generation.
 * Returns an async iterable that yields text chunks.
 */
export async function stream(opts: GenerateOptions) {
  assertMessages(opts.messages);
  const connection = await getConnection(opts.model);
  const model = getModel(connection, opts.model);

  // Conditionally include optional properties to satisfy exactOptionalPropertyTypes
  return streamText({
    model,
    messages: opts.messages,
    ...(opts.maxTokens && { maxOutputTokens: opts.maxTokens }),
    ...(opts.temperature != null && { temperature: opts.temperature }),
    ...(opts.topP != null && { topP: opts.topP }),
    ...(opts.frequencyPenalty != null && {
      frequencyPenalty: opts.frequencyPenalty,
    }),
    ...(opts.presencePenalty != null && {
      presencePenalty: opts.presencePenalty,
    }),
    ...(opts.signal && { abortSignal: opts.signal }),
  });
}

/**
 * Generate structured object output using Zod schema.
 * Use for analysis, categorization, and any structured AI responses.
 * Guarantees type-safe output matching the provided schema.
 */
export async function object<T>(opts: GenerateObjectOptions<T>) {
  assertMessages(opts.messages);
  const connection = await getConnection(opts.model);
  const model = getModel(connection, opts.model);

  return sdkGenerateObject({
    model,
    schema: opts.schema,
    messages: opts.messages,
    ...(opts.maxTokens && { maxOutputTokens: opts.maxTokens }),
    ...(opts.temperature != null && { temperature: opts.temperature }),
    ...(opts.topP != null && { topP: opts.topP }),
    ...(opts.frequencyPenalty != null && {
      frequencyPenalty: opts.frequencyPenalty,
    }),
    ...(opts.presencePenalty != null && {
      presencePenalty: opts.presencePenalty,
    }),
    ...(opts.signal && { abortSignal: opts.signal }),
  });
}

// Aliases for backwards compatibility
export const generateText = generate;
export const generateTextStream = stream;
export const generateObject = object;

/**
 * Get all enabled AI connections from storage.
 */
export function getEnabledConnections(): AIConnection[] {
  const connections = storage.getItem<AIConnection[]>("ai_connections", []);
  return connections.filter((c) => c.enabled);
}

/**
 * Get connection for a specific model.
 */
export function getConnectionForModel(
  modelId: string,
): AIConnection | undefined {
  const connections = storage.getItem<AIConnection[]>("ai_connections", []);
  return connections.find((c) => c.enabled && c.models?.includes(modelId));
}

/**
 * Fetch available models for a connection.
 * For most providers, returns the default models from config.
 * For OpenRouter, fetches from their API.
 */
export async function fetchModelsForConnection(
  connection: AIConnection,
): Promise<string[]> {
  const { provider, apiKey } = connection;

  // OpenRouter supports dynamic model fetching
  if (provider === "openrouter" && apiKey) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data.data?.map((m: { id: string }) => m.id) || [];
      }
    } catch {
      // Fall through to default
    }
  }

  // Return default models from vendor config
  const { AI_VENDORS } = await import("@/lib/config/ai-vendors");
  const vendor = AI_VENDORS[provider];
  return vendor?.defaultModels || [];
}
