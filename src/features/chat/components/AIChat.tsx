'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Settings as SettingsIcon, ChevronDown, ChevronUp, X } from 'lucide-react';
import { ContextSelector, ContextItem } from '@/features/chat/components/context-selector';
import { PromptSelector } from '@/features/chat/components/prompt-selector';
import { ChatSettingsDialog, ChatSettings } from '@/features/chat/components/chat-settings-dialog';
import { ModelCombobox } from '@/features/ai/components/model-combobox';
import { getPromptTemplate } from '@/lib/prompt-templates';
import { useAI } from '@/hooks/use-ai';
import { db } from '@/lib/core/database';
import { ChatThread, ChatMessage } from '@/lib/config/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';


export function AIChat({ projectId }: { projectId: string }) {
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [input, setInput] = useState('');

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
            const dbMessages = await db.chatMessages
                .where('threadId')
                .equals(currentThreadId)
                .sortBy('timestamp');
            return dbMessages.map(m => ({ role: m.role, content: m.content, id: m.id, model: m.model }));
        },
        [currentThreadId],
        []
    ) as Array<Pick<ChatMessage, 'role' | 'content' | 'id' | 'model'>> | undefined;

    // Initialize or load thread on mount
    useEffect(() => {
        const initThread = async () => {
            // Find existing thread for this project
            const existingThreads = await db.chatThreads
                .where('projectId')
                .equals(projectId)
                .and(t => !t.archived)
                .toArray();

            if (existingThreads.length > 0) {
                // Load the most recent thread
                existingThreads.sort((a, b) => b.updatedAt - a.updatedAt);
                setCurrentThreadId(existingThreads[0].id);
            } else {
                // Create a new thread
                const newThread: ChatThread = {
                    id: uuid(),
                    projectId,
                    name: 'New Conversation',
                    pinned: false,
                    archived: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                await db.chatThreads.add(newThread);
                setCurrentThreadId(newThread.id);
            }
        };

        initThread();
    }, [projectId]);

    const assembleContextText = async (): Promise<string> => {
        if (selectedContexts.length === 0) {
            return '';
        }

        const contexts: string[] = [];

        for (const context of selectedContexts) {
            // TODO: Implement actual context loading from database
            contexts.push(`[${context.label}]: Context will be loaded here`);
        }

        return contexts.join('\n\n---\n\n');
    };

    const sendMessage = async () => {
        if (!input.trim() || !currentThreadId) return;

        // Use either selected model or model from hook
        const effectiveModel = selectedModel || model;
        if (!effectiveModel) return;

        // Temporarily set the selected model for this request
        if (selectedModel) {
            setModel(selectedModel);
        }

        // Save user message to database
        const userMessage: ChatMessage = {
            id: uuid(),
            threadId: currentThreadId,
            role: 'user',
            content: input,
            timestamp: Date.now(),
        };
        await db.chatMessages.add(userMessage);

        // Update thread timestamp
        await db.chatThreads.update(currentThreadId, {
            updatedAt: Date.now(),
        });

        const userInput = input;
        setInput('');

        // Assemble context
        const contextText = await assembleContextText();

        // Get prompt template
        const template = getPromptTemplate(selectedPromptId);

        // Build system prompt
        let systemPrompt = template.systemPrompt;
        if (contextText) {
            systemPrompt += `\n\n=== CONTEXT ===\n${contextText}`;
        }

        // Build conversation history
        const conversationHistory = messages?.map(m => m.content).join('\n\n') || '';
        const fullPrompt = conversationHistory
            ? `Previous conversation:\n${conversationHistory}\n\nUser: ${userInput}`
            : userInput;

        // Create placeholder message for streaming
        const aiMessageId = uuid();
        setStreamingMessageId(aiMessageId);
        setStreamingContent('');

        const aiMessage: ChatMessage = {
            id: aiMessageId,
            threadId: currentThreadId,
            role: 'assistant',
            content: '',
            model: effectiveModel,
            prompt: selectedPromptId,
            timestamp: Date.now(),
        };
        await db.chatMessages.add(aiMessage);

        let fullText = '';

        await generateStream(
            {
                prompt: fullPrompt,
                context: systemPrompt,
                maxTokens: settings.maxTokens,
                temperature: settings.temperature,
            },
            {
                onChunk: (chunk) => {
                    fullText += chunk;
                    setStreamingContent(fullText);
                },
                onComplete: async (completedText) => {
                    // Update database with final content
                    await db.chatMessages.update(aiMessageId, {
                        content: completedText,
                    });
                    setStreamingMessageId(null);
                    setStreamingContent('');

                    // Update thread timestamp
                    await db.chatThreads.update(currentThreadId, {
                        updatedAt: Date.now(),
                    });
                },
            }
        );
    };

    const handleCancelGeneration = () => {
        cancel();
        setStreamingMessageId(null);
        setStreamingContent('');
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-4xl mx-auto">
                    {(messages || []).length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            <p className="text-lg font-medium mb-2">Start a conversation</p>
                            <p className="text-sm">Ask about your characters, plot, scenes, or anything else!</p>
                        </div>
                    )}
                    {(messages || []).map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg px-4 py-2 ${m.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                                }`}>
                                <p className="text-sm whitespace-pre-wrap">
                                    {/* Show streaming content if this is the streaming message */}
                                    {streamingMessageId === m.id && streamingContent
                                        ? streamingContent
                                        : m.content}
                                    {/* Show cursor for streaming messages */}
                                    {streamingMessageId === m.id && isGenerating && (
                                        <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse" />
                                    )}
                                </p>
                                {m.model && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {m.model}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                    {isGenerating && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-lg px-4 py-2">
                                <div className="text-sm text-muted-foreground">Thinking...</div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Message Input Area */}
            <div className="border-t bg-background">
                <div className="max-w-4xl mx-auto">
                    {/* Controls (collapsible) */}
                    {showControls && (
                        <div className="p-4 space-y-3 border-b">
                            {/* Context Selector */}
                            <ContextSelector
                                projectId={projectId}
                                selectedContexts={selectedContexts}
                                onContextsChange={setSelectedContexts}
                            />

                            {/* Prompt and Model Row */}
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <PromptSelector
                                        value={selectedPromptId}
                                        onValueChange={setSelectedPromptId}
                                    />
                                </div>
                                <div className="flex-1">
                                    <ModelCombobox
                                        value={selectedModel}
                                        onValueChange={(value) => {
                                            setSelectedModel(value);
                                            setSettings(prev => ({ ...prev, model: value }));
                                        }}
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowSettings(true)}
                                >
                                    <SettingsIcon className="h-4 w-4 mr-2" />
                                    Tweak
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Input Row */}
                    <div className="p-4 flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowControls(!showControls)}
                            className="flex-none"
                        >
                            {showControls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask any question..."
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            className="flex-1"
                        />
                        {isGenerating ? (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelGeneration}
                                title="Cancel generation"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                onClick={sendMessage}
                                disabled={!input.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
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
