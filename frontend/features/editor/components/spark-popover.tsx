'use client';

/**
 * SparkPopover
 * 
 * AI-powered writing prompts popover for the Spark Engine.
 * Shows context-aware prompts with model selection.
 * 
 * Features:
 * - Model selector from user's AI connections
 * - Category filters (dialogue, action, description)
 * - Click to insert prompt text
 * - Regenerate button
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Wand2, MessageCircle, Swords, Mountain, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateText, getEnabledConnections } from '@/lib/ai';
import { storage } from '@/core/storage/safe-storage';
import type { AIConnection } from '@/lib/config/ai-vendors';

interface SparkPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    position: { x: number; y: number } | null;
    sceneContext?: string;
    onInsert: (text: string) => void;
}

type SparkCategory = 'all' | 'dialogue' | 'action' | 'description';

interface SparkPrompt {
    id: string;
    category: SparkCategory;
    text: string;
}

const CATEGORY_CONFIG = {
    all: { label: 'All', icon: Sparkles },
    dialogue: { label: 'Dialogue', icon: MessageCircle },
    action: { label: 'Action', icon: Swords },
    description: { label: 'Setting', icon: Mountain },
};

const SPARK_SYSTEM_PROMPT = `You are a creative writing assistant that generates short, evocative writing prompts.

Generate 4-5 unique, specific writing prompts based on the given context.
Each prompt should be 1-2 sentences that spark creativity.

Categorize each prompt as:
- dialogue: Character speech, conversation starters
- action: Physical actions, movements, events
- description: Settings, atmosphere, sensory details

Format your response as JSON:
[
  {"category": "dialogue", "text": "..."},
  {"category": "action", "text": "..."},
  ...
]

Be specific, vivid, and actionable. Avoid clichés.`;

export function SparkPopover({
    isOpen,
    onClose,
    position,
    sceneContext = '',
    onInsert,
}: SparkPopoverProps) {
    const [connections, setConnections] = useState<AIConnection[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [prompts, setPrompts] = useState<SparkPrompt[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<SparkCategory>('all');
    const popoverRef = useRef<HTMLDivElement>(null);

    // Load connections and saved model on mount
    useEffect(() => {
        const enabledConnections = getEnabledConnections();
        setConnections(enabledConnections);

        // Load saved model preference
        const savedModel = storage.getItem<string>('spark_last_model', '');
        if (savedModel && enabledConnections.some(c => c.models?.includes(savedModel))) {
            setSelectedModel(savedModel);
        } else if (enabledConnections.length > 0 && enabledConnections[0]?.models?.[0]) {
            setSelectedModel(enabledConnections[0]?.models?.[0] ?? '');
        }
    }, []);

    // Generate prompts when opened
    useEffect(() => {
        if (isOpen && selectedModel && prompts.length === 0) {
            generatePrompts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, selectedModel]);

    // Save model preference when changed
    useEffect(() => {
        if (selectedModel) {
            storage.setItem('spark_last_model', selectedModel);
        }
    }, [selectedModel]);

    const generatePrompts = useCallback(async () => {
        if (!selectedModel) {
            setError('Please select an AI model');
            return;
        }

        setIsLoading(true);
        setError(null);

        const contextPrompt = sceneContext
            ? `Based on this scene context:\n\n"${sceneContext.slice(-500)}"\n\nGenerate writing prompts that could continue or enhance this scene.`
            : 'Generate general creative writing prompts for fiction.';

        try {
            const response = await generateText({
                model: selectedModel,
                system: SPARK_SYSTEM_PROMPT,
                prompt: contextPrompt,
                maxTokens: 500,
                temperature: 0.8,
            });

            // Parse JSON response
            const jsonMatch = response.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as Array<{ category: string; text: string }>;
                setPrompts(parsed.map((p, i) => ({
                    id: `${Date.now()}-${i}`,
                    category: p.category as SparkCategory,
                    text: p.text,
                })));
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('Spark generation error:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate prompts');
        } finally {
            setIsLoading(false);
        }
    }, [selectedModel, sceneContext]);

    const handleInsert = (prompt: SparkPrompt) => {
        onInsert(prompt.text);
        onClose();
    };

    const filteredPrompts = activeCategory === 'all'
        ? prompts
        : prompts.filter(p => p.category === activeCategory);

    // Get all models from all connections
    const allModels = connections.flatMap(c => c.models || []);

    if (!isOpen || !position) return null;

    return (
        <div
            ref={popoverRef}
            className="fixed z-50"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            <Card className="w-[380px] shadow-xl border overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <span className="font-semibold">Spark Ideas</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Model Selector */}
                <div className="px-4 py-2 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-muted-foreground" />
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                            <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder="Select model..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allModels.map(model => (
                                    <SelectItem key={model} value={model} className="text-xs">
                                        {model}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={generatePrompts}
                            disabled={isLoading}
                        >
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="px-4 py-2 border-b flex gap-1.5">
                    {(Object.keys(CATEGORY_CONFIG) as SparkCategory[]).map(cat => {
                        const config = CATEGORY_CONFIG[cat];
                        const Icon = config.icon;
                        const count = cat === 'all' ? prompts.length : prompts.filter(p => p.category === cat).length;

                        return (
                            <Badge
                                key={cat}
                                variant={activeCategory === cat ? 'default' : 'outline'}
                                className={cn(
                                    'cursor-pointer text-xs px-2 py-0.5 h-6 gap-1',
                                    activeCategory !== cat && 'hover:bg-muted'
                                )}
                                onClick={() => setActiveCategory(cat)}
                            >
                                <Icon className="h-3 w-3" />
                                {config.label}
                                {count > 0 && <span className="opacity-60">({count})</span>}
                            </Badge>
                        );
                    })}
                </div>

                {/* Prompts */}
                <div className="max-h-[280px] overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin text-amber-500" />
                            <p className="text-sm text-muted-foreground">Generating ideas...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center">
                            <p className="text-sm text-destructive mb-2">{error}</p>
                            <Button variant="outline" size="sm" onClick={generatePrompts}>
                                Try Again
                            </Button>
                        </div>
                    ) : filteredPrompts.length === 0 ? (
                        <div className="p-6 text-center">
                            <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                                {prompts.length === 0 ? 'Click refresh to generate prompts' : 'No prompts in this category'}
                            </p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredPrompts.map(prompt => {
                                const Icon = CATEGORY_CONFIG[prompt.category]?.icon || Sparkles;
                                return (
                                    <button
                                        key={prompt.id}
                                        onClick={() => handleInsert(prompt)}
                                        className="w-full text-left p-3 rounded-lg hover:bg-muted/70 transition-colors group"
                                    >
                                        <div className="flex items-start gap-2">
                                            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                                            <p className="text-sm leading-relaxed">{prompt.text}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t bg-muted/10 text-xs text-muted-foreground">
                    Click a prompt to insert at cursor
                </div>
            </Card>
        </div>
    );
}
