'use client';

import { useState, useEffect } from 'react';
import { type ContextItem } from '@/features/shared/components';
import { ChatSettingsDialog, ChatSettings } from './chat-settings-dialog';
import { getPromptTemplate } from '@/shared/prompts/templates';
import { useAI } from '@/hooks/use-ai';
import { useChatRepository } from '@/hooks/use-chat-repository';
import { useContextAssembly } from '@/hooks/use-context-assembly';
import { ChatMessage } from '@/lib/config/types';
import { useLiveQuery } from '@/hooks/use-live-query';

// Extracted sub-components
import { AIChatMessageList } from './ai-chat-message-list';
import { AIChatControls } from './ai-chat-controls';
import { AIChatInput } from './ai-chat-input';

/**
 * AIChat - Main Chat Component
 * 
 * Orchestrates the chat functionality using decomposed sub-components:
 * - AIChatMessageList: Message display with streaming
 * - AIChatControls: Context, prompt, and model selection
 * - AIChatInput: Text input with send/cancel
 * 
 * Series-first: requires seriesId for context selection
 */
interface AIChatProps {
    projectId: string;
    seriesId: string;  // Required - series-first architecture
}

export function AIChat({ projectId, seriesId }: AIChatProps) {
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const chatRepo = useChatRepository();
    const { assembleContext } = useContextAssembly(projectId);

    // Context & Prompt
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);
    const [selectedPromptId, setSelectedPromptId] = useState('general');

    // Model & Settings
    const [selectedModel, setSelectedModel] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<ChatSettings>({
        model: '',
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
    });

    // UI State
    const [showControls, setShowControls] = useState(true);
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    const [streamingContent, setStreamingContent] = useState('');

    // Use unified AI hook
    const { generateStream, isGenerating, model, setModel, cancel } = useAI({
        system: 'You are a creative writing assistant',
        streaming: true,
        persistModel: true,
        operationName: 'Chat',
    });

    // Load messages from database
    const messages = useLiveQuery(
        async () => {
            if (!currentThreadId) return [];
            const dbMessages = await chatRepo.getMessagesByThread(currentThreadId);
            return dbMessages.map(m => ({ role: m.role, content: m.content, id: m.id, model: m.model }));
        },
        [currentThreadId, chatRepo]
    ) as Array<Pick<ChatMessage, 'role' | 'content' | 'id' | 'model'>> | undefined;

    // Initialize or load thread on mount
    useEffect(() => {
        const initThread = async () => {
            const existingThreads = await chatRepo.getThreadsByProject(projectId);
            const activeThreads = existingThreads.filter(t => !t.archived);

            if (activeThreads.length > 0 && activeThreads[0]) {
                activeThreads.sort((a, b) => b.updatedAt - a.updatedAt);
                setCurrentThreadId(activeThreads[0].id);
            } else {
                const newThread = await chatRepo.createThread({
                    projectId,
                    name: 'New Conversation',
                    pinned: false,
                    archived: false,
                });
                setCurrentThreadId(newThread.id);
            }
        };
        initThread();
    }, [projectId, chatRepo]);

    const sendMessage = async () => {
        if (!input.trim() || !currentThreadId) return;

        const effectiveModel = selectedModel || model;
        if (!effectiveModel) return;

        if (selectedModel) setModel(selectedModel);

        // Save user message
        await chatRepo.createMessage({
            threadId: currentThreadId,
            role: 'user',
            content: input,
            timestamp: Date.now(),
        });
        await chatRepo.updateThread(currentThreadId, { updatedAt: Date.now() });

        const userInput = input;
        setInput('');

        // Build prompt - ✅ Use centralized context assembly
        const contextText = await assembleContext(selectedContexts);
        const template = getPromptTemplate(selectedPromptId);
        let systemPrompt = template.systemPrompt;
        if (contextText) {
            systemPrompt += `\\n\\n=== CONTEXT ===\\n${contextText}`;
        }

        const conversationHistory = messages?.map(m => m.content).join('\n\n') || '';
        const fullPrompt = conversationHistory
            ? `Previous conversation:\n${conversationHistory}\n\nUser: ${userInput}`
            : userInput;

        // Create assistant message placeholder
        const aiMessage = await chatRepo.createMessage({
            threadId: currentThreadId,
            role: 'assistant',
            content: '',
            model: effectiveModel,
            prompt: selectedPromptId,
            timestamp: Date.now(),
        });
        setStreamingMessageId(aiMessage.id);

        let fullText = '';
        await generateStream(
            { prompt: fullPrompt, context: systemPrompt, maxTokens: settings.maxTokens, temperature: settings.temperature },
            {
                onChunk: (chunk) => { fullText += chunk; setStreamingContent(fullText); },
                onComplete: async (completedText) => {
                    await chatRepo.updateMessage(aiMessage.id, { content: completedText });
                    setStreamingMessageId(null);
                    setStreamingContent('');
                    await chatRepo.updateThread(currentThreadId, { updatedAt: Date.now() });
                },
            }
        );
    };

    const handleCancelGeneration = () => {
        cancel();
        setStreamingMessageId(null);
        setStreamingContent('');
    };

    const handleModelChange = (value: string) => {
        setSelectedModel(value);
        setSettings(prev => ({ ...prev, model: value }));
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Message List */}
            <AIChatMessageList
                messages={messages || []}
                streamingMessageId={streamingMessageId}
                streamingContent={streamingContent}
                isGenerating={isGenerating}
            />

            {/* Input Area */}
            <div className="border-t bg-background">
                <div className="max-w-4xl mx-auto">
                    {showControls && (
                        <AIChatControls
                            projectId={projectId}
                            seriesId={seriesId}
                            selectedContexts={selectedContexts}
                            onContextsChange={setSelectedContexts}
                            selectedPromptId={selectedPromptId}
                            onPromptChange={setSelectedPromptId}
                            selectedModel={selectedModel}
                            onModelChange={handleModelChange}
                            onOpenSettings={() => setShowSettings(true)}
                        />
                    )}
                    <AIChatInput
                        input={input}
                        onInputChange={setInput}
                        onSend={sendMessage}
                        onCancel={handleCancelGeneration}
                        showControls={showControls}
                        onToggleControls={() => setShowControls(!showControls)}
                        isGenerating={isGenerating}
                    />
                </div>
            </div>

            {/* Settings Dialog */}
            <ChatSettingsDialog
                open={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                onSettingsChange={setSettings}
            />
        </div>
    );
}

