'use client';

/**
 * ModelSelector Component
 *
 * Displays available AI models from connected providers.
 * Uses ModelDiscoveryService to fetch models dynamically from provider APIs.
 *
 * @see CODING_GUIDELINES.md - 8-Layer Architecture, Layer 1 (UI)
 */

import { useState, useCallback } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useModelDiscovery } from '@/hooks/use-model-discovery';
import type { AIModel } from '@/domain/services/IModelDiscoveryService';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}

/**
 * Group models by provider for display
 */
function groupModelsByProvider(models: AIModel[]): Map<string, AIModel[]> {
    const grouped = new Map<string, AIModel[]>();

    for (const model of models) {
        const provider = model.provider;
        if (!grouped.has(provider)) {
            grouped.set(provider, []);
        }
        grouped.get(provider)!.push(model);
    }

    return grouped;
}

/**
 * Get display name for provider
 */
function getProviderDisplayName(provider: string): string {
    const names: Record<string, string> = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        google: 'Google AI',
        openrouter: 'OpenRouter',
        groq: 'Groq',
        mistral: 'Mistral AI',
        deepseek: 'DeepSeek',
        cohere: 'Cohere',
        xai: 'xAI',
        azure: 'Azure OpenAI',
        togetherai: 'Together.ai',
        fireworks: 'Fireworks',
        perplexity: 'Perplexity',
        kimi: 'Kimi',
    };
    return names[provider] || provider;
}

/**
 * Get icon for provider
 */
function getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
        openai: '⚡',
        anthropic: '🧠',
        google: '🔷',
        openrouter: '🔀',
        groq: '⚡',
        mistral: '🌫️',
        deepseek: '🔍',
        cohere: '📊',
        xai: '🤖',
        azure: '☁️',
        togetherai: '🤝',
        fireworks: '🎆',
        perplexity: '🔎',
        kimi: '🌙',
    };
    return icons[provider] || '○';
}

export function ModelSelector({ value, onValueChange, className }: ModelSelectorProps) {
    const { models, isLoading, error, refreshModels } = useModelDiscovery({
        autoFetch: true,
        fetchAll: true,
    });

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await refreshModels();
        } finally {
            setIsRefreshing(false);
        }
    }, [refreshModels]);

    // Group models by provider
    const groupedModels = groupModelsByProvider(models);

    // Get current model's provider for display
    const currentModel = models.find((m) => m.id === value);
    const currentProvider = currentModel?.provider;

    return (
        <div className="flex items-center gap-2">
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger className={cn('flex-1', className)}>
                    <SelectValue placeholder="Select a model">
                        {value && (
                            <div className="flex items-center gap-2">
                                <span>{currentProvider ? getProviderIcon(currentProvider) : '○'}</span>
                                <span className="truncate">{currentModel?.name || value}</span>
                            </div>
                        )}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <ScrollArea className="max-h-[60dvh]">
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Loading models...</span>
                            </div>
                        ) : error && models.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted-foreground">
                                <AlertCircle className="h-5 w-5 text-destructive" />
                                <span>Failed to load models</span>
                                <span className="text-xs">{error}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    className="mt-2"
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : groupedModels.size > 0 ? (
                            Array.from(groupedModels.entries()).map(([provider, providerModels]) => (
                                <SelectGroup key={provider}>
                                    <SelectLabel className="sticky top-0 z-10 bg-popover py-1.5 text-xs font-semibold text-muted-foreground">
                                        {getProviderIcon(provider)} {getProviderDisplayName(provider)}
                                        <span className="ml-1 text-xs font-normal">
                                            ({providerModels.length})
                                        </span>
                                    </SelectLabel>
                                    {providerModels.map((model) => (
                                        <SelectItem key={model.id} value={model.id}>
                                            <div className="flex flex-col">
                                                <span className="truncate text-sm">{model.name}</span>
                                                {model.contextWindow && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {Math.round(model.contextWindow / 1000)}K context
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                <p>No models available.</p>
                                <p className="mt-1 text-xs">
                                    Add an AI connection in Settings to get started.
                                </p>
                            </div>
                        )}
                    </ScrollArea>
                </SelectContent>
            </Select>

            {/* Refresh button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                title="Refresh models"
                className="h-9 w-9 flex-shrink-0"
            >
                <RefreshCw className={cn('h-4 w-4', (isRefreshing || isLoading) && 'animate-spin')} />
            </Button>
        </div>
    );
}
