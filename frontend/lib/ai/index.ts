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
    generateText,  // Alias for backwards compatibility
    generateTextStream,  // Alias for backwards compatibility
    getEnabledConnections,
    getConnectionForModel,
    fetchModelsForConnection,
    type GenerateOptions,
} from './client';

// Provider exports
export { getModel } from './providers';
