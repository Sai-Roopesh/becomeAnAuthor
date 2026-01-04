'use client';
/**
 * Unified AI Hook
 * Single hook for all AI generation with streaming, cancellation, and state management
 * Uses Vercel AI SDK's streamText for all providers
 */

import { useState, useCallback, useRef } from 'react';
import { stream, generate } from '@/lib/ai';
import { storage } from '@/core/storage/safe-storage';
import { toast } from '@/shared/utils/toast-service';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('useAI');

export interface UseAIOptions {
    /** Initial model to use */
    defaultModel?: string;
    /** System prompt */
    system?: string;
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

/**
 * Get initial model from storage or default
 */
function getDefaultModel(preferred?: string): string {
    if (preferred) return preferred;
    const lastUsed = storage.getItem<string>('last_used_model', '');
    if (lastUsed) return lastUsed;
    return 'gemini-2.5-flash'; // Fallback default
}

/**
 * Unified AI hook for all generation needs
 * 
 * @example
 * ```tsx
 * const { generateStream, isGenerating, cancel } = useAI();
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
    const [model, setModel] = useState(() => getDefaultModel(options.defaultModel));
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Non-streaming generation
     */
    const generateText = useCallback(async (genOptions: GenerateOptions): Promise<string> => {
        if (isGenerating) {
            log.warn('Generation already in progress');
            return '';
        }

        setIsGenerating(true);
        setError(null);
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const fullPrompt = genOptions.context
                ? `${genOptions.context}\n\n${genOptions.prompt}`
                : genOptions.prompt;

            const systemPrompt = genOptions.system || options.system;
            const result = await generate({
                model,
                prompt: fullPrompt,
                signal: controller.signal,
                ...(systemPrompt && { system: systemPrompt }),
                ...(genOptions.maxTokens && { maxTokens: genOptions.maxTokens }),
                ...(genOptions.temperature != null && { temperature: genOptions.temperature }),
            });

            if (options.persistModel) {
                storage.setItem('last_used_model', model);
            }

            return result.text;
        } catch (err: unknown) {
            const e = err as Error;
            if (e.name !== 'AbortError') {
                const errorMsg = `${options.operationName || 'Generation'} failed: ${e.message}`;
                setError(errorMsg);
                toast.error(errorMsg);
            }
            return '';
        } finally {
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    }, [model, isGenerating, options]);

    /**
     * Streaming generation with callbacks
     */
    const generateStream = useCallback(async (
        genOptions: GenerateOptions,
        callbacks: StreamCallbacks = {}
    ): Promise<string> => {
        if (isGenerating) {
            log.warn('Generation already in progress');
            return '';
        }

        setIsGenerating(true);
        setError(null);
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const fullPrompt = genOptions.context
                ? `${genOptions.context}\n\n${genOptions.prompt}`
                : genOptions.prompt;

            const systemPrompt = genOptions.system || options.system;
            const result = await stream({
                model,
                prompt: fullPrompt,
                signal: controller.signal,
                ...(systemPrompt && { system: systemPrompt }),
                ...(genOptions.maxTokens && { maxTokens: genOptions.maxTokens }),
                ...(genOptions.temperature != null && { temperature: genOptions.temperature }),
            });

            let fullText = '';
            for await (const chunk of result.textStream) {
                fullText += chunk;
                callbacks.onChunk?.(chunk);
            }

            if (options.persistModel) {
                storage.setItem('last_used_model', model);
            }

            callbacks.onComplete?.(fullText);
            return fullText;
        } catch (err: unknown) {
            const e = err as Error;
            if (e.name !== 'AbortError') {
                const errorMsg = `${options.operationName || 'Generation'} failed: ${e.message}`;
                setError(errorMsg);
                toast.error(errorMsg);
                callbacks.onError?.(e);
            }
            return '';
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
