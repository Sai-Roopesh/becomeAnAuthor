import {
  streamText,
  generateText as sdkGenerateText,
  generateObject as sdkGenerateObject,
} from "ai";
import type { ZodType } from "zod";
import { getModel } from "./providers";
import { storage } from "@/core/storage/safe-storage";
import type { AIConnection } from "@/lib/config/ai-vendors";

export interface GenerateOptions {
  model: string;
  system?: string;
  prompt: string;
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
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  signal?: AbortSignal;
}

/**
 * Finds the connection configuration for a given model.
 * Searches enabled connections that include the model in their models list.
 */
function getConnection(modelId: string): AIConnection {
  const connections = storage.getItem<AIConnection[]>("ai_connections", []);
  const connection = connections.find(
    (c) => c.enabled && c.models?.includes(modelId),
  );

  if (!connection) {
    // Fallback: try to find any enabled connection
    const fallback = connections.find((c) => c.enabled);
    if (fallback) {
      return fallback;
    }
    throw new Error(
      `No AI connection found for model: ${modelId}. Please configure a connection in Settings.`,
    );
  }

  return connection;
}

/**
 * Generate text (non-streaming).
 * Use for one-shot generation like analysis, spark prompts, etc.
 */
export async function generate(opts: GenerateOptions) {
  const connection = getConnection(opts.model);
  const model = getModel(connection, opts.model);

  // Conditionally include optional properties to satisfy exactOptionalPropertyTypes
  return sdkGenerateText({
    model,
    prompt: opts.prompt,
    ...(opts.system && { system: opts.system }),
    ...(opts.maxTokens && { maxOutputTokens: opts.maxTokens }),
    ...(opts.temperature != null && { temperature: opts.temperature }),
    ...(opts.topP != null && { topP: opts.topP }),
    ...(opts.frequencyPenalty != null && { frequencyPenalty: opts.frequencyPenalty }),
    ...(opts.presencePenalty != null && { presencePenalty: opts.presencePenalty }),
    ...(opts.signal && { abortSignal: opts.signal }),
  });
}

/**
 * Stream text with real-time chunks.
 * Use for chat, rewrites, and interactive generation.
 * Returns an async iterable that yields text chunks.
 */
export async function stream(opts: GenerateOptions) {
  const connection = getConnection(opts.model);
  const model = getModel(connection, opts.model);

  // Conditionally include optional properties to satisfy exactOptionalPropertyTypes
  return streamText({
    model,
    prompt: opts.prompt,
    ...(opts.system && { system: opts.system }),
    ...(opts.maxTokens && { maxOutputTokens: opts.maxTokens }),
    ...(opts.temperature != null && { temperature: opts.temperature }),
    ...(opts.topP != null && { topP: opts.topP }),
    ...(opts.frequencyPenalty != null && { frequencyPenalty: opts.frequencyPenalty }),
    ...(opts.presencePenalty != null && { presencePenalty: opts.presencePenalty }),
    ...(opts.signal && { abortSignal: opts.signal }),
  });
}

/**
 * Generate structured object output using Zod schema.
 * Use for analysis, categorization, and any structured AI responses.
 * Guarantees type-safe output matching the provided schema.
 */
export async function object<T>(opts: GenerateObjectOptions<T>) {
  const connection = getConnection(opts.model);
  const model = getModel(connection, opts.model);

  return sdkGenerateObject({
    model,
    schema: opts.schema,
    prompt: opts.prompt,
    ...(opts.system && { system: opts.system }),
    ...(opts.maxTokens && { maxOutputTokens: opts.maxTokens }),
    ...(opts.temperature != null && { temperature: opts.temperature }),
    ...(opts.topP != null && { topP: opts.topP }),
    ...(opts.frequencyPenalty != null && { frequencyPenalty: opts.frequencyPenalty }),
    ...(opts.presencePenalty != null && { presencePenalty: opts.presencePenalty }),
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
