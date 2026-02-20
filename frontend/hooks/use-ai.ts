"use client";
/**
 * Unified AI Hook
 * Single hook for all AI generation with streaming, cancellation, and state management
 * Uses Vercel AI SDK's streamText for all providers
 */

import { useState, useCallback, useRef } from "react";
import { stream, generate } from "@/lib/ai";
import { storage } from "@/core/storage/safe-storage";
import { toast } from "@/shared/utils/toast-service";
import { logger } from "@/shared/utils/logger";
import type { AIModelMessage } from "@/lib/ai/client";

const log = logger.scope("useAI");

export interface UseAIOptions {
  /** Initial model to use */
  defaultModel?: string;
  /** System prompt prepended to every request */
  defaultSystem?: string;
  /** Auto-save model selection */
  persistModel?: boolean;
  /** Operation name for error messages */
  operationName?: string;
}

export interface GenerateOptions {
  /** Optional per-request model override */
  model?: string;
  /** Full conversation payload */
  messages: AIModelMessage[];
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
  /** Nucleus sampling */
  topP?: number;
  /** Penalize repeated tokens */
  frequencyPenalty?: number;
  /** Encourage novel topic tokens */
  presencePenalty?: number;
  /** Override system prompt */
  system?: string;
}

export interface StreamCallbacks {
  /** Called for each chunk of text */
  onChunk?: (chunk: string) => void;
  /** Called when generation completes */
  onComplete?: (fullText: string) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

function withSystemMessage(
  messages: AIModelMessage[],
  systemPrompt?: string,
): AIModelMessage[] {
  if (!systemPrompt) return messages;

  // Ensure system instruction is always the first message and never mixed into user content.
  return [{ role: "system", content: systemPrompt }, ...messages];
}

/**
 * Get initial model from storage or default
 */
function getDefaultModel(preferred?: string): string {
  if (preferred) return preferred;
  const lastUsed = storage.getItem<string>("last_used_model", "");
  if (lastUsed) return lastUsed;
  return "";
}

/**
 * Unified AI hook for all generation needs
 *
 * @example
 * ```tsx
 * const { generateStream, isGenerating, cancel } = useAI();
 *
 * await generateStream(
 *   { messages: [{ role: 'user', content: 'Write a story' }] },
 *   {
 *     onChunk: (chunk) => setResult(prev => prev + chunk),
 *     onComplete: (text) => console.log('Done!', text)
 *   }
 * );
 * ```
 */
export function useAI(options: UseAIOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState(() =>
    getDefaultModel(options.defaultModel),
  );
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  /**
   * Non-streaming generation
   */
  const generateText = useCallback(
    async (genOptions: GenerateOptions): Promise<string> => {
      if (inFlightRef.current || isGenerating) {
        log.warn("Generation already in progress");
        return "";
      }
      if (genOptions.messages.length === 0) {
        const errorMsg = `${options.operationName || "Generation"} failed: no messages provided`;
        setError(errorMsg);
        toast.error(errorMsg);
        return "";
      }

      inFlightRef.current = true;
      setIsGenerating(true);
      setError(null);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const modelToUse = genOptions.model || model;
        const systemPrompt = genOptions.system ?? options.defaultSystem;
        const messages = withSystemMessage(genOptions.messages, systemPrompt);
        const result = await generate({
          model: modelToUse,
          messages,
          signal: controller.signal,
          ...(genOptions.maxTokens && { maxTokens: genOptions.maxTokens }),
          ...(genOptions.temperature != null && {
            temperature: genOptions.temperature,
          }),
          ...(genOptions.topP != null && { topP: genOptions.topP }),
          ...(genOptions.frequencyPenalty != null && {
            frequencyPenalty: genOptions.frequencyPenalty,
          }),
          ...(genOptions.presencePenalty != null && {
            presencePenalty: genOptions.presencePenalty,
          }),
        });

        if (options.persistModel) {
          storage.setItem("last_used_model", modelToUse);
        }

        return result.text;
      } catch (err: unknown) {
        const e = err as Error;
        if (e.name !== "AbortError") {
          const errorMsg = `${options.operationName || "Generation"} failed: ${e.message}`;
          setError(errorMsg);
          toast.error(errorMsg);
        }
        return "";
      } finally {
        inFlightRef.current = false;
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [model, isGenerating, options],
  );

  /**
   * Streaming generation with callbacks
   */
  const generateStream = useCallback(
    async (
      genOptions: GenerateOptions,
      callbacks: StreamCallbacks = {},
    ): Promise<string> => {
      if (inFlightRef.current || isGenerating) {
        log.warn("Generation already in progress");
        return "";
      }
      if (genOptions.messages.length === 0) {
        const errorMsg = `${options.operationName || "Generation"} failed: no messages provided`;
        setError(errorMsg);
        toast.error(errorMsg);
        return "";
      }

      inFlightRef.current = true;
      setIsGenerating(true);
      setError(null);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const modelToUse = genOptions.model || model;
        const systemPrompt = genOptions.system ?? options.defaultSystem;
        const messages = withSystemMessage(genOptions.messages, systemPrompt);
        const result = await stream({
          model: modelToUse,
          messages,
          signal: controller.signal,
          ...(genOptions.maxTokens && { maxTokens: genOptions.maxTokens }),
          ...(genOptions.temperature != null && {
            temperature: genOptions.temperature,
          }),
          ...(genOptions.topP != null && { topP: genOptions.topP }),
          ...(genOptions.frequencyPenalty != null && {
            frequencyPenalty: genOptions.frequencyPenalty,
          }),
          ...(genOptions.presencePenalty != null && {
            presencePenalty: genOptions.presencePenalty,
          }),
        });

        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
          callbacks.onChunk?.(chunk);
        }

        if (options.persistModel) {
          storage.setItem("last_used_model", modelToUse);
        }

        callbacks.onComplete?.(fullText);
        return fullText;
      } catch (err: unknown) {
        const e = err as Error;
        if (e.name !== "AbortError") {
          const errorMsg = `${options.operationName || "Generation"} failed: ${e.message}`;
          setError(errorMsg);
          toast.error(errorMsg);
          callbacks.onError?.(e);
        }
        return "";
      } finally {
        inFlightRef.current = false;
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [model, isGenerating, options],
  );

  /**
   * Cancel ongoing generation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.info("Generation cancelled");
    }
  }, []);

  return {
    // State
    isGenerating,
    model,
    error,

    // Actions
    setModel,
    generate: generateText,
    generateStream,
    cancel,
  };
}
