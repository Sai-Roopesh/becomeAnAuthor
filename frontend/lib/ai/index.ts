/**
 * AI Module - Unified exports
 *
 * Provides multi-vendor AI generation using Vercel AI SDK:
 * - 14 providers: OpenAI, Anthropic, Google, Mistral, DeepSeek, Groq, etc.
 * - Streaming support via streamText
 * - Non-streaming via generateText
 */

// AI client exports
export {
  generate,
  stream,
  object,
  generateText, // Alias for backwards compatibility
  generateTextStream, // Alias for backwards compatibility
  generateObject, // Alias for backwards compatibility
  getEnabledConnections,
  getConnectionForModel,
  fetchModelsForConnection,
  type GenerateOptions,
  type GenerateObjectOptions,
  type AIModelMessage,
  type AIMessageRole,
} from "./client";

// Provider exports
export { getModel } from "./providers";
