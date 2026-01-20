'use client';
/**
 * useChat Hook
 *
 * Purpose: Encapsulates chat state, streaming, and persistence for Tauri desktop app.
 * Similar API to Vercel AI SDK's useChat, but works with local Tauri backend.
 *
 * State Machine: 'idle' → 'generating' → 'streaming' → 'complete' → 'idle'
 *                            ↓              ↓
 *                        'error'      'cancelled'
 */

import { useState, useCallback, useRef, useEffect, FormEvent } from 'react';
import { useLiveQuery, invalidateQueries } from '@/hooks/use-live-query';
import { useChatRepository } from '@/features/chat/hooks/use-chat-repository';
import { useContextAssembly } from '@/hooks/use-context-assembly';
import { stream } from '@/lib/ai';
import { storage } from '@/core/storage/safe-storage';
import { toast } from '@/shared/utils/toast-service';
import { logger } from '@/shared/utils/logger';
import { getPromptTemplate } from '@/shared/prompts/templates';
import type { ChatMessage, ChatContext } from '@/domain/entities/types';
import type { ContextItem } from '@/features/shared/components';

const log = logger.scope('useChat');

export interface UseChatOptions {
    /** Thread ID for this chat */
    threadId: string;
    /** Project ID for context assembly */
    projectId?: string | undefined;
    /** Series ID for codex context */
    seriesId?: string | undefined;
    /** Initial model to use (defaults to last used or gemini-2.5-flash) */
    initialModel?: string | undefined;
    /** System prompt override */
    systemPrompt?: string | undefined;
    /** Prompt template ID */
    promptId?: string | undefined;
    /** Max tokens for generation */
    maxTokens?: number | undefined;
    /** Temperature for generation */
    temperature?: number | undefined;
    /** Callback when message is complete */
    onFinish?: ((message: ChatMessage) => void) | undefined;
    /** Callback on error */
    onError?: ((error: Error) => void) | undefined;
}

export interface UseChatReturn {
    /** All messages in the thread */
    messages: ChatMessage[];
    /** Current input value */
    input: string;
    /** Set input value */
    setInput: (value: string) => void;
    /** Submit the current input */
    handleSubmit: (e?: FormEvent) => void;
    /** Send a message directly (bypasses input state) */
    append: (content: string, contexts?: ContextItem[]) => Promise<void>;
    /** Whether generation is in progress */
    isLoading: boolean;
    /** Stop the current generation */
    stop: () => void;
    /** Regenerate the last assistant message */
    reload: () => void;
    /** Current error if any */
    error: Error | null;
    /** Currently selected model */
    model: string;
    /** Set the model */
    setModel: (model: string) => void;
    /** Currently streaming content (for real-time display) */
    streamingContent: string;
    /** ID of the message currently streaming */
    streamingMessageId: string | null;
    /** Context items for the current message */
    selectedContexts: ContextItem[];
    /** Set context items */
    setSelectedContexts: (contexts: ContextItem[]) => void;
}

function getDefaultModel(preferred?: string): string {
    if (preferred) return preferred;
    const lastUsed = storage.getItem<string>('last_used_model', '');
    if (lastUsed) return lastUsed;
    return 'gemini-2.5-flash';
}

/**
 * useChat - Chat state management hook
 *
 * @example
 * ```tsx
 * const { messages, input, setInput, handleSubmit, isLoading, stop } = useChat({
 *   threadId,
 *   projectId,
 * });
 *
 * return (
 *   <>
 *     {messages.map(m => <Message key={m.id} message={m} />)}
 *     <input value={input} onChange={e => setInput(e.target.value)} />
 *     <button onClick={handleSubmit} disabled={isLoading}>Send</button>
 *     {isLoading && <button onClick={stop}>Cancel</button>}
 *   </>
 * );
 * ```
 */
export function useChat(options: UseChatOptions): UseChatReturn {
    const {
        threadId,
        projectId = '',
        seriesId,
        initialModel,
        systemPrompt,
        promptId = 'general',
        maxTokens = 2000,
        temperature = 0.7,
        onFinish,
        onError,
    } = options;

    const chatRepo = useChatRepository();

    // State
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [model, setModel] = useState(() => getDefaultModel(initialModel));
    const [streamingContent, setStreamingContent] = useState('');
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);

    // Refs
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);

    // Context assembly hook
    const { assembleContext } = useContextAssembly(projectId);

    // Live query for messages - automatically updates when invalidateQueries() is called
    const messagesQuery = useLiveQuery(
        () => chatRepo.getMessagesByThread(threadId),
        [threadId]
    );
    const messages = messagesQuery ?? [];

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            abortControllerRef.current?.abort();
        };
    }, []);

    // Persist model selection
    useEffect(() => {
        if (model) {
            storage.setItem('last_used_model', model);
        }
    }, [model]);

    /**
     * Core send function - handles message creation, streaming, and persistence
     */
    const sendMessage = useCallback(
        async (content: string, contexts: ContextItem[] = []) => {
            if (!content.trim() || isLoading) return;

            if (!model) {
                toast.error('Please select a model to start chatting.');
                return;
            }

            setIsLoading(true);
            setError(null);

            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                // Build context for the message
                const chatContext: ChatContext = {};
                contexts.forEach((item) => {
                    if (item.type === 'novel') chatContext.novelText = 'full';
                    if (item.type === 'outline') chatContext.novelText = 'outline';
                    if (item.type === 'act' && item.id) {
                        if (!chatContext.acts) chatContext.acts = [];
                        chatContext.acts.push(item.id);
                    }
                    if (item.type === 'chapter' && item.id) {
                        if (!chatContext.chapters) chatContext.chapters = [];
                        chatContext.chapters.push(item.id);
                    }
                    if (item.type === 'scene' && item.id) {
                        if (!chatContext.scenes) chatContext.scenes = [];
                        chatContext.scenes.push(item.id);
                    }
                    if (item.type === 'codex' && item.id) {
                        if (!chatContext.codexEntries) chatContext.codexEntries = [];
                        chatContext.codexEntries.push(item.id);
                    }
                });

                // Create user message
                const userMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    threadId,
                    role: 'user',
                    content: content.trim(),
                    ...(Object.keys(chatContext).length > 0 && { context: chatContext }),
                    timestamp: Date.now(),
                };

                await chatRepo.createMessage(userMessage);
                invalidateQueries(); // Trigger UI update

                // Create AI message placeholder
                const aiMessageId = crypto.randomUUID();
                const aiMessage: ChatMessage = {
                    id: aiMessageId,
                    threadId,
                    role: 'assistant',
                    content: '',
                    model,
                    timestamp: Date.now(),
                };

                await chatRepo.createMessage(aiMessage);
                invalidateQueries(); // Show placeholder immediately

                setStreamingMessageId(aiMessageId);
                setStreamingContent('');

                // Build system prompt with context
                const contextText = await assembleContext(contexts);
                const template = getPromptTemplate(promptId);
                let finalSystemPrompt =
                    systemPrompt || template?.systemPrompt || 'You are a creative writing assistant.';

                if (contextText) {
                    finalSystemPrompt += `\n\n=== CONTEXT ===\n${contextText}`;
                }

                // Stream the response
                let fullText = '';
                const result = await stream({
                    model,
                    prompt: content.trim(),
                    system: finalSystemPrompt,
                    maxTokens,
                    temperature,
                    signal: controller.signal,
                });

                for await (const chunk of result.textStream) {
                    if (!isMountedRef.current) break;
                    fullText += chunk;
                    setStreamingContent(fullText);
                }

                // Save completed message
                if (isMountedRef.current) {
                    await chatRepo.updateMessage(aiMessageId, { content: fullText });
                    invalidateQueries();

                    // Update thread timestamp and model
                    await chatRepo.updateThread(threadId, {
                        updatedAt: Date.now(),
                        defaultModel: model,
                    });

                    setStreamingMessageId(null);
                    setStreamingContent('');

                    // Callback
                    const completedMessage: ChatMessage = {
                        ...aiMessage,
                        content: fullText,
                    };
                    onFinish?.(completedMessage);
                }
            } catch (err) {
                const e = err as Error;
                if (e.name !== 'AbortError') {
                    log.error('Chat generation failed:', e);
                    setError(e);

                    // Save error as message content
                    if (streamingMessageId && isMountedRef.current) {
                        await chatRepo.updateMessage(streamingMessageId, {
                            content: `Error: ${e.message}`,
                        });
                        invalidateQueries();
                    }

                    toast.error(`Generation failed: ${e.message}`);
                    onError?.(e);
                } else {
                    log.info('Generation cancelled by user');
                    toast.info('Generation cancelled');
                }

                setStreamingMessageId(null);
                setStreamingContent('');
            } finally {
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
                abortControllerRef.current = null;
            }
        },
        [
            threadId,
            model,
            isLoading,
            chatRepo,
            assembleContext,
            promptId,
            systemPrompt,
            maxTokens,
            temperature,
            onFinish,
            onError,
            streamingMessageId,
        ]
    );

    /**
     * Handle form submit
     */
    const handleSubmit = useCallback(
        (e?: FormEvent) => {
            e?.preventDefault();
            const content = input;
            setInput('');
            sendMessage(content, selectedContexts);
        },
        [input, selectedContexts, sendMessage]
    );

    /**
     * Append a message directly (bypasses input state)
     */
    const append = useCallback(
        async (content: string, contexts?: ContextItem[]) => {
            await sendMessage(content, contexts ?? selectedContexts);
        },
        [sendMessage, selectedContexts]
    );

    /**
     * Stop the current generation
     */
    const stop = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    /**
     * Regenerate the last assistant message
     */
    const reload = useCallback(async () => {
        if (isLoading || messages.length === 0) return;

        // Find last user message
        const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
        if (!lastUserMessage) return;

        // Delete all messages after the last user message
        const lastUserIndex = messages.findIndex((m) => m.id === lastUserMessage.id);
        const messagesToDelete = messages.slice(lastUserIndex + 1);

        for (const msg of messagesToDelete) {
            await chatRepo.deleteMessage(msg.id);
        }
        invalidateQueries();

        // Resend the last user message
        await sendMessage(lastUserMessage.content, []);
    }, [messages, isLoading, chatRepo, sendMessage]);

    return {
        messages,
        input,
        setInput,
        handleSubmit,
        append,
        isLoading,
        stop,
        reload,
        error,
        model,
        setModel,
        streamingContent,
        streamingMessageId,
        selectedContexts,
        setSelectedContexts,
    };
}
