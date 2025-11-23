'use client';

import { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Send, MoreVertical, Pin, Archive, Download, Trash2, Settings as SettingsIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { ChatMessage } from './chat-message';
import { ContextSelector, ContextItem } from './context-selector';
import { PromptSelector } from './prompt-selector';
import { ChatSettingsDialog, ChatSettings } from './chat-settings-dialog';
import { ModelSelector } from '@/components/ai/model-selector';
import { useChatStore } from '@/store/use-chat-store';
import { generateText } from '@/lib/ai-service';
import { getPromptTemplate } from '@/lib/prompt-templates';
import { extractTextFromContent } from '@/lib/editor-utils';
import type { ChatContext, Scene, CodexEntry, Act, Chapter } from '@/lib/types';
import { toast } from '@/lib/toast-service';
import { storage } from '@/lib/safe-storage';
import { STORAGE_KEYS } from '@/lib/constants';

interface ChatThreadProps {
    threadId: string;
}

export function ChatThread({ threadId }: ChatThreadProps) {
    // Thread State
    const [message, setMessage] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [threadName, setThreadName] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { setActiveThreadId } = useChatStore();

    // AI Configuration State
    const [selectedContexts, setSelectedContexts] = useState<ContextItem[]>([]);
    const [selectedPromptId, setSelectedPromptId] = useState('general');
    const [selectedModel, setSelectedModel] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [settings, setSettings] = useState<ChatSettings>({
        model: '',
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
    });

    // Data Queries
    const thread = useLiveQuery(() => db.chatThreads.get(threadId), [threadId]);
    const messages = useLiveQuery(
        () => db.chatMessages
            .where('threadId')
            .equals(threadId)
            .sortBy('timestamp'),
        [threadId]
    );

    // Effects
    useEffect(() => {
        if (thread) {
            setThreadName(thread.name);
            // Initialize model from thread default or local storage
            const savedModel = thread.defaultModel || localStorage.getItem('last_used_model') || '';
            if (savedModel) {
                setSelectedModel(savedModel);
                setSettings(prev => ({ ...prev, model: savedModel }));
            }
        }
    }, [thread]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handlers
    const handleSend = async () => {
        if (!message.trim() || isSending) return;

        const effectiveModel = selectedModel || settings.model;
        if (!effectiveModel) {
            toast.error('Please select a model to start chatting.');
            return;
        }

        // Map ContextItem[] to ChatContext
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
            context,
            timestamp: Date.now(),
        };

        await db.chatMessages.add(userMessage);
        setMessage('');
        setIsSending(true);

        try {
            // Build context text
            const contextText = await buildContextText(context, thread?.projectId || '');

            // Get prompt template
            const template = getPromptTemplate(selectedPromptId);

            // Build system prompt
            let systemPrompt = template.systemPrompt;
            if (contextText) {
                systemPrompt += `\n\n=== CONTEXT ===\n${contextText}`;
            }

            // Build conversation history for the prompt
            const conversationHistory = messages?.map(m =>
                `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
            ).join('\n\n') || '';

            const fullPrompt = conversationHistory
                ? `Previous conversation:\n${conversationHistory}\n\nUser: ${userMessage.content}`
                : userMessage.content;

            // Generate response using unified service
            const response = await generateText({
                model: effectiveModel,
                system: systemPrompt,
                prompt: fullPrompt,
                maxTokens: settings.maxTokens,
                temperature: settings.temperature,
            });

            await db.chatMessages.add({
                id: crypto.randomUUID(),
                threadId,
                role: 'assistant',
                content: response.text,
                model: effectiveModel,
                timestamp: Date.now(),
            });

            // Update thread updated time and default model
            await db.chatThreads.update(threadId, {
                updatedAt: Date.now(),
                defaultModel: effectiveModel
            });

            // Save last used model preference
            localStorage.setItem('last_used_model', effectiveModel);

        } catch (error) {
            console.error('Chat error:', error);
            await db.chatMessages.add({
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

    const handleSaveName = async () => {
        if (threadName.trim() && thread) {
            await db.chatThreads.update(threadId, { name: threadName.trim() });
        }
        setIsEditingName(false);
    };

    const handlePin = async () => {
        if (thread) {
            await db.chatThreads.update(threadId, { pinned: !thread.pinned });
        }
    };

    const handleArchive = async () => {
        if (thread) {
            await db.chatThreads.update(threadId, { archived: true });
            setActiveThreadId(null);
        }
    };

    const handleDelete = async () => {
        if (confirm('Delete this chat? This cannot be undone.')) {
            await db.chatMessages.where('threadId').equals(threadId).delete();
            await db.chatThreads.delete(threadId);
            setActiveThreadId(null);
        }
    };

    const handleExport = async () => {
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
            {/* Top Bar */}
            <div className="border-b p-3 flex items-center gap-2 bg-background z-10">
                {isEditingName ? (
                    <Input
                        value={threadName}
                        onChange={(e) => setThreadName(e.target.value)}
                        onBlur={handleSaveName}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                        }}
                        className="h-8 flex-1"
                        autoFocus
                    />
                ) : (
                    <button
                        onClick={() => setIsEditingName(true)}
                        className="flex-1 text-left font-medium hover:text-primary transition-colors"
                    >
                        {thread.name}
                    </button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handlePin}>
                            <Pin className="h-4 w-4 mr-2" />
                            {thread.pinned ? 'Unpin' : 'Pin'} Thread
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleArchive}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive Thread
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Thread
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                <div className="space-y-4 max-w-4xl mx-auto">
                    {messages?.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            <p className="text-lg font-medium mb-2">Start a new conversation</p>
                            <p className="text-sm">Select a model and context below to begin.</p>
                        </div>
                    )}
                    {messages?.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} threadId={threadId} />
                    ))}
                    {isSending && (
                        <div className="flex justify-start">
                            <div className="bg-muted rounded-lg px-4 py-2">
                                <div className="text-sm text-muted-foreground animate-pulse">Thinking...</div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t bg-background">
                <div className="max-w-4xl mx-auto">
                    {/* Collapsible Controls */}
                    {showControls && (
                        <div className="p-3 space-y-3 border-b bg-muted/10">
                            <ContextSelector
                                projectId={thread.projectId}
                                selectedContexts={selectedContexts}
                                onContextsChange={setSelectedContexts}
                            />

                            <div className="flex gap-2 flex-wrap">
                                <div className="flex-1 min-w-[200px]">
                                    <PromptSelector
                                        value={selectedPromptId}
                                        onValueChange={setSelectedPromptId}
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
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
                                    className="h-10"
                                >
                                    <SettingsIcon className="h-4 w-4 mr-2" />
                                    Settings
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Input Row */}
                    <div className="p-3 flex gap-2 items-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowControls(!showControls)}
                            className="flex-none h-10 w-10 p-0 rounded-full"
                            title={showControls ? "Hide Controls" : "Show Controls"}
                        >
                            {showControls ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </Button>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Type your message..."
                            className="flex-1 min-h-[40px] max-h-[200px] py-2"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!message.trim() || isSending}
                            size="icon"
                            className="h-10 w-10"
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

async function buildContextText(context: ChatContext, projectId: string): Promise<string> {
    if (!projectId) return '';
    const parts: string[] = [];

    // 1. Full Novel Text
    if (context.novelText === 'full') {
        const scenes = await db.nodes
            .where('projectId').equals(projectId)
            .filter(n => n.type === 'scene')
            .sortBy('order');

        const fullText = scenes.map(s => {
            const scene = s as Scene;
            return `[Scene: ${scene.title}]\n${extractTextFromContent(scene.content)}`;
        }).join('\n\n');

        parts.push(`=== FULL NOVEL TEXT ===\n${fullText}`);
    }

    // 2. Outline
    if (context.novelText === 'outline') {
        const nodes = await db.nodes
            .where('projectId').equals(projectId)
            .sortBy('order');

        const outline = nodes.map(n => {
            const indent = n.type === 'act' ? '' : n.type === 'chapter' ? '  ' : '    ';
            let info = `${indent}- [${n.type.toUpperCase()}] ${n.title}`;
            if (n.type === 'scene') {
                const scene = n as Scene;
                if (scene.summary) info += `\n${indent}  Summary: ${scene.summary}`;
            }
            return info;
        }).join('\n');

        parts.push(`=== NOVEL OUTLINE ===\n${outline}`);
    }

    // 3. Specific Acts
    if (context.acts && context.acts.length > 0) {
        for (const actId of context.acts) {
            const act = await db.nodes.get(actId) as Act;
            if (act) {
                // Find all chapters in this act
                const chapters = await db.nodes.where('parentId').equals(actId).toArray();
                const chapterIds = chapters.map(c => c.id);

                // Find all scenes in these chapters
                const scenes = await db.nodes
                    .where('projectId').equals(projectId)
                    .filter(n => n.type === 'scene' && chapterIds.includes(n.parentId || ''))
                    .sortBy('order');

                const actText = scenes.map(s => {
                    const scene = s as Scene;
                    return `[Scene: ${scene.title}]\n${extractTextFromContent(scene.content)}`;
                }).join('\n\n');

                parts.push(`=== ACT: ${act.title} ===\n${actText}`);
            }
        }
    }

    // 4. Specific Chapters
    if (context.chapters && context.chapters.length > 0) {
        for (const chapterId of context.chapters) {
            const chapter = await db.nodes.get(chapterId) as Chapter;
            if (chapter) {
                const scenes = await db.nodes
                    .where('parentId').equals(chapterId)
                    .sortBy('order');

                const chapterText = scenes.map(s => {
                    const scene = s as Scene;
                    return `[Scene: ${scene.title}]\n${extractTextFromContent(scene.content)}`;
                }).join('\n\n');

                parts.push(`=== CHAPTER: ${chapter.title} ===\n${chapterText}`);
            }
        }
    }

    // 5. Specific Scenes
    if (context.scenes && context.scenes.length > 0) {
        for (const sceneId of context.scenes) {
            const scene = await db.nodes.get(sceneId) as Scene;
            if (scene) {
                parts.push(`=== SCENE: ${scene.title} ===\n${extractTextFromContent(scene.content)}`);
            }
        }
    }

    // 6. Codex Entries
    if (context.codexEntries && context.codexEntries.length > 0) {
        const entries = await db.codex.bulkGet(context.codexEntries);
        const validEntries = entries.filter(e => e !== undefined) as CodexEntry[];

        const codexText = validEntries.map(e =>
            `[Codex: ${e.name} (${e.category})]\n${e.description}\n${e.notes ? `Notes: ${e.notes}` : ''}`
        ).join('\n\n');

        if (codexText) {
            parts.push(`=== CODEX ENTRIES ===\n${codexText}`);
        }
    }

    return parts.join('\n\n');
}
