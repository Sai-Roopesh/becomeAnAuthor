"use client";
/**
 * Unified AI Hook
 * Single hook for all AI generation with streaming, cancellation, and state management
 * Replaces useAIGeneration and direct generateText calls
 */

import { useState, useCallback, useRef } from 'react';
import { generateText, generateTextStream } from '@/lib/ai';
import { getValidatedModel, formatAIError, buildAIPrompt, persistModelSelection } from '@/shared/utils/ai-utils';
import { toast } from '@/shared/utils/toast-service';
import { AI_DEFAULTS } from '@/lib/config/constants';

export interface UseAIOptions {
    /** Initial model to use */
    defaultModel?: string;
    /** System prompt */
    system?: string;
    /** Enable streaming by default */
    streaming?: boolean;
    /** Auto-save model selection */
    persistModel?: boolean;
    /** Operation name for error messages */
    operationName?: string;
}

export interface GenerateOptions {
    /** The main user prompt */
    prompt: string;
    /** Optional context to prepend to prompt */
    context?: string;
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Temperature for generation */
    temperature?: number;
    /** Override hook's streaming preference */
    stream?: boolean;
}

export interface StreamCallbacks {
    /** Called for each chunk of text */
    onChunk?: (chunk: string) => void;
    /** Called when generation completes */
    onComplete?: (fullText: string) => void;
}

/**
 * Unified AI hook for all generation needs
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const { generate, isGenerating, model, setModel } = useAI({
 *   system: 'You are a helpful assistant',
 *   operationName: 'Chat'
 * });
 * 
 * const response = await generate({ prompt: 'Hello!' });
 * ```
 * 
 * @example
 * ```tsx
 * // Streaming with callbacks
 * const { generateStream, cancel } = useAI({ streaming: true });
 * 
 * await generateStream(
 *   { prompt: 'Write a story' },
 *   {
 *     onChunk: (chunk) => setResult(prev => prev + chunk),
 *     onComplete: (text) => console.log('Done!', text)
 *   }
 * );
 * ```
 */
export function useAI(options: UseAIOptions = {}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [model, setModel] = useState(() => {
        const { model: validatedModel } = getValidatedModel(options.defaultModel);
        return validatedModel;
    });
    const [error, setError] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const streamingPreference = options.streaming ?? true;

    /**
     * Main generation function
     * Returns the generated text or empty string on error
     */
    const generate = useCallback(async (
        genOptions: GenerateOptions
    ): Promise<string> => {
        if (isGenerating) {
            console.warn('[useAI] Generation already in progress');
            return '';
        }

        // Validate model
        const { model: validModel, isValid } = getValidatedModel(model);
        if (!isValid) {
            const errorMsg = 'No AI model configured. Please set up an AI connection.';
            setError(errorMsg);
            toast.error(errorMsg);
            return '';
        }

        setIsGenerating(true);
        setError(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // Build prompt with context
            const { system, prompt } = buildAIPrompt({
                ...(options.system && { system: options.system }),
                ...(genOptions.context && { context: genOptions.context }),
                prompt: genOptions.prompt,
            });

            const useStreaming = genOptions.stream ?? streamingPreference;

            if (useStreaming) {
                // Streaming generation
                let fullText = '';

                await generateTextStream({
                    model: validModel,
                    system,
                    prompt,
                    maxTokens: genOptions.maxTokens || AI_DEFAULTS.MAX_TOKENS,
                    temperature: genOptions.temperature ?? AI_DEFAULTS.TEMPERATURE,
                    signal: controller.signal,
                    onChunk: (chunk) => {
                        fullText += chunk;
                    },
                    onComplete: () => {
                        // Optionally persist model
                        if (options.persistModel) {
                            persistModelSelection(validModel);
                        }
                    },
                    onError: (err) => {
                        console.error('[useAI] Streaming error:', err);
                    },
                });

                return fullText;
            } else {
                // Non-streaming generation
                const response = await generateText({
                    model: validModel,
                    system,
                    prompt,
                    maxTokens: genOptions.maxTokens || AI_DEFAULTS.MAX_TOKENS,
                    temperature: genOptions.temperature ?? AI_DEFAULTS.TEMPERATURE,
                    signal: controller.signal,
                });

                if (options.persistModel) {
                    persistModelSelection(validModel);
                }

                return response.text;
            }
        } catch (err) {
            const errorMsg = formatAIError(err, options.operationName || 'Generation');
            if (errorMsg) {
                setError(errorMsg);
                toast.error(errorMsg);
            }
            return '';
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }, [model, isGenerating, streamingPreference, options]);

    /**
     * Generate with streaming callbacks (for real-time UI updates)
     * Useful when you need to display text as it's being generated
     */
    const generateStream = useCallback(async (
        genOptions: GenerateOptions,
        callbacks: StreamCallbacks = {}
    ): Promise<void> => {
        if (isGenerating) {
            console.warn('[useAI] Generation already in progress');
            return;
        }

        const { model: validModel, isValid } = getValidatedModel(model);
        if (!isValid) {
            toast.error('No AI model configured.');
            return;
        }

        setIsGenerating(true);
        setError(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const { system, prompt } = buildAIPrompt({
                ...(options.system && { system: options.system }),
                ...(genOptions.context && { context: genOptions.context }),
                prompt: genOptions.prompt,
            });

            let fullText = '';

            await generateTextStream({
                model: validModel,
                system,
                prompt,
                maxTokens: genOptions.maxTokens || AI_DEFAULTS.MAX_TOKENS,
                temperature: genOptions.temperature ?? AI_DEFAULTS.TEMPERATURE,
                signal: controller.signal,
                onChunk: (chunk) => {
                    fullText += chunk;
                    callbacks.onChunk?.(chunk);
                },
                onComplete: () => {
                    if (options.persistModel) {
                        persistModelSelection(validModel);
                    }
                    callbacks.onComplete?.(fullText);
                },
                onError: (err) => {
                    console.error('[useAI] Stream error:', err);
                },
            });
        } catch (err) {
            const errorMsg = formatAIError(err, options.operationName || 'Generation');
            if (errorMsg) {
                setError(errorMsg);
                toast.error(errorMsg);
            }
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }, [model, isGenerating, options]);

    /**
     * Cancel ongoing generation
     */
    const cancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            toast.info('Generation cancelled');
        }
    }, []);

    /**
     * Retry last generation (useful for error recovery)
     * Note: You need to store lastOptions externally to use this
     */
    const retry = useCallback(async (lastOptions: GenerateOptions) => {
        return generate(lastOptions);
    }, [generate]);

    return {
        // State
        isGenerating,
        model,
        error,

        // Actions
        setModel,
        generate,
        generateStream,
        cancel,
        retry,
    };
}
