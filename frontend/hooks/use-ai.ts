"use client";
/**
 * Unified AI Hook
 * Single hook for all AI generation with streaming, cancellation, and state management
 * Uses Vercel AI SDK's streamText for all providers
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { stream, generate } from "@/lib/ai";
import {
  APP_PREF_KEYS,
  getAppPreference,
  setAppPreference,
} from "@/core/state/app-state";
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
  /** Called when generation completes successfully */
  onComplete?: (fullText: string) => Promise<void> | void;
  /** Called on non-abort error; partialText holds any accumulated tokens */
  onError?: (error: Error, partialText: string) => void;
  /** Called when generation is cancelled via abort */
  onCancel?: () => Promise<void> | void;
}

// 2-minute hard timeout for hung providers
const STREAM_TIMEOUT_MS = 120_000;

function withSystemMessage(
  messages: AIModelMessage[],
  systemPrompt?: string,
): AIModelMessage[] {
  if (!systemPrompt) return messages;

  // Ensure system instruction is always the first message and never mixed into user content.
  return [{ role: "system", content: systemPrompt }, ...messages];
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
 *     onComplete: (text) => {}
 *   }
 * );
 * ```
 */
export function useAI(options: UseAIOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState(() => options.defaultModel ?? "");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  // H-9: Stable ref for options so useCallback deps don't include the options object
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    if (options.defaultModel) {
      return;
    }

    let cancelled = false;
    void getAppPreference<string>(APP_PREF_KEYS.LAST_USED_MODEL, "").then(
      (savedModel) => {
        if (!cancelled && savedModel.trim().length > 0) {
          setModel(savedModel);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [options.defaultModel]);

  // H-8: Abort any in-flight request when the component unmounts
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Non-streaming generation
   */
  const generateText = useCallback(
    async (genOptions: GenerateOptions): Promise<string> => {
      const opts = optionsRef.current;
      if (inFlightRef.current || isGenerating) {
        log.warn("Generation already in progress");
        return "";
      }
      if (genOptions.messages.length === 0) {
        const errorMsg = `${opts.operationName || "Generation"} failed: no messages provided`;
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
        const systemPrompt = genOptions.system ?? opts.defaultSystem;
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

        if (opts.persistModel) {
          await setAppPreference(APP_PREF_KEYS.LAST_USED_MODEL, modelToUse);
        }

        return result.text;
      } catch (err: unknown) {
        const e = err as Error;
        if (e.name !== "AbortError") {
          const errorMsg = `${opts.operationName || "Generation"} failed: ${e.message}`;
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
    // H-9: remove options and isGenerating from deps; read via optionsRef/inFlightRef
    [model],
  );

  /**
   * Streaming generation with callbacks
   */
  const generateStream = useCallback(
    async (
      genOptions: GenerateOptions,
      callbacks: StreamCallbacks = {},
    ): Promise<string> => {
      const opts = optionsRef.current;
      if (inFlightRef.current || isGenerating) {
        log.warn("Generation already in progress");
        return "";
      }
      if (genOptions.messages.length === 0) {
        const errorMsg = `${opts.operationName || "Generation"} failed: no messages provided`;
        setError(errorMsg);
        toast.error(errorMsg);
        return "";
      }

      inFlightRef.current = true;
      setIsGenerating(true);
      setError(null);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // M-7: Hard timeout so hung providers don't spin forever
      const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

      // M-4: Hoist fullText so the catch block can pass partial tokens to onError
      let fullText = "";

      try {
        const modelToUse = genOptions.model || model;
        const systemPrompt = genOptions.system ?? opts.defaultSystem;
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

        for await (const chunk of result.textStream) {
          fullText += chunk;
          callbacks.onChunk?.(chunk);
        }

        if (opts.persistModel) {
          await setAppPreference(APP_PREF_KEYS.LAST_USED_MODEL, modelToUse);
        }

        // H-6: await onComplete so DB writes finish before isGenerating clears
        await callbacks.onComplete?.(fullText);
        return fullText;
      } catch (err: unknown) {
        const e = err as Error;
        if (e.name === "AbortError") {
          // H-5: Cancelled — call onCancel instead of onError so the caller
          // can clean up the placeholder message rather than silently leaving it.
          await callbacks.onCancel?.();
        } else {
          // M-4: Pass accumulated partialText so caller can preserve streamed tokens
          // M-5: Do NOT call toast here — infrastructure must not own UI
          const errorMsg = `${opts.operationName || "Generation"} failed: ${e.message}`;
          setError(errorMsg);
          callbacks.onError?.(e, fullText);
        }
        return "";
      } finally {
        clearTimeout(timeout);
        inFlightRef.current = false;
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    // H-9: remove options and isGenerating from deps
    [model],
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
