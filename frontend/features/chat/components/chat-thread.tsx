'use client';

import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useChatRepository } from '@/features/chat/hooks/use-chat-repository';
import { useChatService } from '@/features/chat/hooks/use-chat-service';
import { ChatSettingsDialog, ChatSettings } from './chat-settings-dialog';
import { useChatStore } from '@/store/use-chat-store';
import { type ContextItem } from '@/features/shared/components';
import type { ChatContext } from '@/lib/config/types';
import { toast } from '@/lib/toast-service';
import { useConfirmation } from '@/hooks/use-confirmation';
import { storage } from '@/lib/safe-storage';

// Import child components
import { ChatHeader } from './chat-header';
import { ChatControls } from './chat-controls';
import { ChatMessageList } from './chat-message-list';
import { ChatInput } from './chat-input';

interface ChatThreadProps {
    threadId: string;
}

/**
 * Chat Thread  - Main Coordinator Component
 * Orchestrates child components and manages state
 * Reduced from 410 lines to ~150 lines via component decomposition
 */
export function ChatThread({ threadId }: ChatThreadProps) {
    const chatRepo = useChatRepository();
    const chatService = useChatService();
    const { setActiveThreadId } = useChatStore();
    const { confirm: confirmDelete, ConfirmationDialog } = useConfirmation();

    // State
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);
    const [selectedPromptId, setSelectedPromptId] = useState('general');
    const [selectedModel, setSelectedModel] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [settings, setSettings] = useState<ChatSettings>({
        model: '',
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Data Queries
    const thread = useLiveQuery(() => chatRepo.getThread(threadId), [threadId]);
    const messages = useLiveQuery(
        () => chatRepo.getMessagesByThread(threadId),
        [threadId]
    );

    // Effects
    useEffect(() => {
        if (thread) {
            const savedModel = thread.defaultModel || storage.getItem<string>('last_used_model', '');
            if (savedModel) {
                setSelectedModel(savedModel);
                setSettings(prev => ({ ...prev, model: savedModel }));
            }
        }
    }, [thread]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handlers
    const handleSend = async () => {
        if (!message.trim() || isSending) return;

        const effectiveModel = selectedModel || settings.model;
        if (!effectiveModel) {
            toast.error('Please select a model to start chatting.');
            return;
        }

        // Build context from selections
        const context: ChatContext = {};
        selectedContexts.forEach(item => {
            if (item.type === 'novel') context.novelText = 'full';
            if (item.type === 'outline') context.novelText = 'outline';
            if (item.type === 'act' && item.id) {
                if (!context.acts) context.acts = [];
                context.acts.push(item.id);
            }
            if (item.type === 'chapter' && item.id) {
                if (!context.chapters) context.chapters = [];
                context.chapters.push(item.id);
            }
            if (item.type === 'scene' && item.id) {
                if (!context.scenes) context.scenes = [];
                context.scenes.push(item.id);
            }
            if (item.type === 'codex' && item.id) {
                if (!context.codexEntries) context.codexEntries = [];
                context.codexEntries.push(item.id);
            }
        });

        const userMessage = {
            id: crypto.randomUUID(),
            threadId,
            role: 'user' as const,
            content: message.trim(),
            context: Object.keys(context).length > 0 ? context : undefined,
            timestamp: Date.now(),
        };

        setMessage('');
        await chatRepo.createMessage(userMessage);

        // Generate AI response
        setIsSending(true);
        try {
            const { responseText, model: usedModel } = await chatService.generateResponse({
                message: userMessage.content,
                threadId,
                projectId: thread?.projectId || '',
                context: userMessage.context,
                model: effectiveModel,
                settings,
                promptId: selectedPromptId,
            });

            await chatRepo.createMessage({
                id: crypto.randomUUID(),
                threadId,
                role: 'assistant',
                content: responseText,
                model: usedModel,
                timestamp: Date.now(),
            });

            await chatRepo.updateThread(threadId, {
                updatedAt: Date.now(),
                defaultModel: usedModel
            });

            // Save last used model for other features
            storage.setItem('last_used_model', usedModel);
        } catch (error) {
            console.error('Chat error:', error);
            await chatRepo.createMessage({
                id: crypto.randomUUID(),
                threadId,
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`,
                timestamp: Date.now(),
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleRegenerateFrom = async (timestamp: number) => {
        if (!messages) return;

        const allMessages = await chatRepo.getMessagesByThread(threadId);
        const messagesToDelete = allMessages.filter(m => m.timestamp >= timestamp);
        await Promise.all(messagesToDelete.map(m => chatRepo.deleteMessage(m.id)));

        const lastUserMessage = allMessages
            .filter(m => m.timestamp < timestamp && m.role === 'user')
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (lastUserMessage) {
            setIsSending(true);
            try {
                const effectiveModel = selectedModel || settings.model;
                const { responseText, model: usedModel } = await chatService.generateResponse({
                    message: lastUserMessage.content,
                    threadId,
                    projectId: thread?.projectId || '',
                    context: lastUserMessage.context,
                    model: effectiveModel,
                    settings,
                    promptId: selectedPromptId,
                });

                await chatRepo.createMessage({
                    id: crypto.randomUUID(),
                    threadId,
                    role: 'assistant',
                    content: responseText,
                    model: usedModel,
                    timestamp: Date.now(),
                });
            } catch (error) {
                console.error('Regeneration error:', error);
                toast.error('Failed to regenerate response');
            } finally {
                setIsSending(false);
            }
        }
    };

    const handleNameChange = async (name: string) => {
        await chatRepo.updateThread(threadId, { name });
    };

    const handlePin = async () => {
        if (thread) {
            await chatRepo.updateThread(threadId, { pinned: !thread.pinned });
        }
    };

    const handleArchive = async () => {
        await chatRepo.updateThread(threadId, { archived: true });
        setActiveThreadId(null);
    };

    const handleDelete = async () => {
        const confirmed = await confirmDelete({
            title: 'Delete Thread',
            description: 'Are you sure you want to delete this chat thread? All messages will be permanently removed.',
            confirmText: 'Delete',
            variant: 'destructive'
        });

        if (confirmed) {
            await chatRepo.deleteThread(threadId);
            setActiveThreadId(null);
        }
    };

    const handleExport = () => {
        if (!messages) return;
        const markdown = messages.map(m =>
            `**${m.role === 'user' ? 'You' : 'AI'}**: ${m.content}\n\n`
        ).join('');
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${thread?.name || 'chat'}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!thread) return null;

    return (
        <div className="h-full flex flex-col">
            {/* Header Component */}
            <ChatHeader
                threadName={thread.name}
                isPinned={thread.pinned || false}
                onNameChange={handleNameChange}
                onPin={handlePin}
                onArchive={handleArchive}
                onExport={handleExport}
                onDelete={handleDelete}
                onOpenSettings={() => setShowSettings(true)}
            />

            {/* Controls Component */}
            <ChatControls
                projectId={thread.projectId}
                selectedContexts={selectedContexts}
                onContextChange={setSelectedContexts}
                selectedPromptId={selectedPromptId}
                onPromptChange={setSelectedPromptId}
                selectedModel={selectedModel}
                onModelChange={(model) => {
                    setSelectedModel(model);
                    setSettings(prev => ({ ...prev, model }));
                }}
                showControls={showControls}
                onToggleControls={() => setShowControls(!showControls)}
            />

            {/* Message List Component */}
            <ChatMessageList
                messages={messages}
                isLoading={isSending}
                threadId={threadId}
                onRegenerateFrom={handleRegenerateFrom}
                messagesEndRef={messagesEndRef}
                onSuggestionClick={(suggestion) => {
                    setMessage(suggestion);
                    // Auto-send after a short delay for better UX
                    setTimeout(() => {
                        const sendBtn = document.querySelector('[data-chat-send]') as HTMLButtonElement;
                        sendBtn?.click();
                    }, 100);
                }}
            />

            {/* Input Component */}
            <ChatInput
                value={message}
                onChange={setMessage}
                onSend={handleSend}
                disabled={isSending}
            />

            {/* Settings Dialog */}
            <ChatSettingsDialog
                open={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                onSettingsChange={setSettings}
            />

            <ConfirmationDialog />
        </div>
    );
}
