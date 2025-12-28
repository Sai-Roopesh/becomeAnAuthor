'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { storage } from '@/core/storage/safe-storage';

// ModelInfo type was defined for documentation but not used - removed to fix lint

interface ModelSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}

export function ModelSelector({ value, onValueChange, className }: ModelSelectorProps) {
    const [connections, setConnections] = useState<{ name: string; models: string[]; provider: string }[]>([]);

    useEffect(() => {
        loadModels();
    }, []);

    const loadModels = () => {
        // Load models from AI connections using safe-storage
        interface StoredAIConnection {
            enabled: boolean;
            name: string;
            models?: string[];
            provider: string;
        }
        const allConnections = storage.getItem<StoredAIConnection[]>('ai_connections', []);

        const enabledConnections = allConnections
            .filter((c) => c.enabled)
            .map((c) => ({
                name: c.name,
                models: c.models || [],
                provider: c.provider
            }))
            .filter((c) => c.models.length > 0);

        setConnections(enabledConnections);
    };

    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className={className}>
                <SelectValue placeholder="Select a model">
                    {value && (
                        <div className="flex items-center gap-2">
                            <ModelIcon provider={getProviderFromId(value)} />
                            <span className="truncate">{value}</span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <ScrollArea className="max-h-[80dvh]">
                    {connections.length > 0 ? (
                        connections.map((conn) => (
                            <SelectGroup key={conn.name}>
                                <SelectLabel className="text-xs text-muted-foreground sticky top-0 bg-popover z-10 py-1">
                                    {conn.name}
                                </SelectLabel>
                                {Array.from(new Set(conn.models)).map((modelId) => (
                                    <SelectItem key={modelId} value={modelId}>
                                        <div className="flex items-center gap-2">
                                            <ModelIcon provider={conn.provider} />
                                            <div className="flex flex-col">
                                                <span className="text-sm truncate max-w-[250px]">{modelId}</span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ))
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No models available. Configure your AI connections in settings.
                        </div>
                    )}
                </ScrollArea>
            </SelectContent>
        </Select>
    );
}

function getProviderFromId(modelId: string): string {
    if (modelId.includes('openai')) return 'OpenAI';
    if (modelId.includes('anthropic') || modelId.includes('claude')) return 'Anthropic';
    if (modelId.includes('google') || modelId.includes('gemini')) return 'Google';
    if (modelId.includes('deepseek')) return 'DeepSeek';
    if (modelId.includes('mistral')) return 'Mistral';
    return 'Other';
}

function ModelIcon({ provider }: { provider?: string }) {
    // Simple icon representation - could be enhanced with actual icon components
    const getIcon = () => {
        switch (provider) {
            case 'OpenAI':
                return '○'; // OpenAI icon placeholder
            case 'Anthropic':
                return '◇'; // Anthropic icon placeholder
            case 'Google':
                return '●'; // Google icon placeholder
            case 'DeepSeek':
                return '◉'; // DeepSeek icon placeholder
            default:
                return '○';
        }
    };

    return <span className="text-muted-foreground">{getIcon()}</span>;
}
