'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { ContextSelector, ContextItem } from '@/features/chat/components/context-selector';
import { PromptSelector } from '@/features/chat/components/prompt-selector';
import { ChatSettingsDialog, ChatSettings } from '@/features/chat/components/chat-settings-dialog';
import { ModelSelector } from '@/features/ai/components/model-selector';
import { getPromptTemplate } from '@/lib/prompt-templates';
import { generateText } from '@/lib/core/ai-client';
import { useProjectStore } from '@/store/use-project-store';
import { db } from '@/lib/core/database';
import { ChatThread, ChatMessage } from '@/lib/config/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { toast } from '@/lib/toast-service';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function AIChat({ projectId }: { projectId: string }) {
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    // Load messages from database
    const messages = useLiveQuery(
        async () => {
            if (!currentThreadId) return [];
            const dbMessages = await db.chatMessages
                .where('threadId')
                .equals(currentThreadId)
                .sortBy('timestamp');
            return dbMessages.map(m => ({ role: m.role, content: m.content }));
        },
        [currentThreadId],
        []
    ) as Message[];

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

        const effectiveModel = selectedModel || settings.model;
        if (!effectiveModel) {
            toast.error('Please select a model in settings');
            return;
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
        setIsLoading(true);

        try {
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
            const conversationHistory = messages.map(m => m.content).join('\n\n');
            const fullPrompt = conversationHistory
                ? `Previous conversation:\n${conversationHistory}\n\nUser: ${userInput}`
                : userInput;

            // Generate response
            const response = await generateText({
                model: effectiveModel,
                system: systemPrompt,
                prompt: fullPrompt,
                maxTokens: settings.maxTokens,
                temperature: settings.temperature,
            });

            // Save AI response to database
            const aiMessage: ChatMessage = {
                id: uuid(),
                threadId: currentThreadId,
                role: 'assistant',
                content: response.text,
                model: effectiveModel,
                prompt: selectedPromptId,
                timestamp: Date.now(),
            };
            await db.chatMessages.add(aiMessage);

            // Update thread timestamp
            await db.chatThreads.update(currentThreadId, {
                updatedAt: Date.now(),
            });
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';

            // ✅ Show toast notification to user
            toast.error(errorMessage);

            // Save error message to database
            const errorDbMessage: ChatMessage = {
                id: uuid(),
                threadId: currentThreadId,
                role: 'assistant',
                content: `Error: ${errorMessage}`,
                timestamp: Date.now(),
            };
            await db.chatMessages.add(errorDbMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-4xl mx-auto">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            <p className="text-lg font-medium mb-2">Start a conversation</p>
                            <p className="text-sm">Ask about your characters, plot, scenes, or anything else!</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg px-4 py-2 ${m.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                                }`}>
                                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
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
                                    <ModelSelector
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
                        <Button
                            size="icon"
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
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
