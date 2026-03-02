import {
  streamText,
  generateText as sdkGenerateText,
  generateObject as sdkGenerateObject,
} from "ai";
import type { ZodType } from "zod";
import { getModel } from "./providers";
import { storage } from "@/core/storage/safe-storage";
import {
  AI_VENDORS,
  connectionRequiresApiKey,
  type AIConnection,
} from "@/lib/config/ai-vendors";
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

async function resolveConnectionApiKey(
  connection: AIConnection,
): Promise<string> {
  return (await getAPIKey(connection.provider, connection.id)) || "";
}

async function getConnection(modelId: string): Promise<AIConnection> {
  const normalizedModel = modelId.trim();
  if (!normalizedModel) {
    throw new Error("A model must be selected before using AI features.");
  }

  const connections = storage.getItem<AIConnection[]>("ai_connections", []);
  const candidates = connections.filter(
    (connection) =>
      connection.enabled && connection.models?.includes(normalizedModel),
  );

  if (candidates.length === 0) {
    throw new Error(
      `No enabled AI connection supports model "${normalizedModel}". Add or configure a matching connection in Settings.`,
    );
  }

  for (const connection of candidates) {
    if (!connectionRequiresApiKey(connection)) {
      return { ...connection, apiKey: "" };
    }

    const apiKey = await resolveConnectionApiKey(connection);
    if (apiKey.trim().length > 0) {
      return { ...connection, apiKey };
    }
  }

  const providerList = Array.from(
    new Set(
      candidates.map((connection) => AI_VENDORS[connection.provider].name),
    ),
  ).join(", ");

  throw new Error(`Missing API key for ${providerList}. Add it in Settings.`);
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

/**
 * Get all enabled AI connections from storage.
 */
export function getEnabledConnections(): AIConnection[] {
  const connections = storage.getItem<AIConnection[]>("ai_connections", []);
  return connections.filter((c) => c.enabled);
}

/**
 * Check whether at least one enabled connection is currently usable.
 * Resolves secure local credentials for providers that require API keys.
 */
export async function hasUsableAIConnection(): Promise<boolean> {
  const connections = storage.getItem<AIConnection[]>("ai_connections", []);
  const enabled = connections.filter((connection) => connection.enabled);
  if (enabled.length === 0) return false;

  for (const connection of enabled) {
    if (!connectionRequiresApiKey(connection)) {
      return true;
    }

    const key = await resolveConnectionApiKey(connection);
    if (key.trim().length > 0) {
      return true;
    }
  }

  return false;
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
