'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storage } from '@/lib/safe-storage';

interface Connection {
    name: string;
    models: string[];
    provider: string;
}

interface ModelComboboxProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}

export function ModelCombobox({ value, onValueChange, className }: ModelComboboxProps) {
    const [open, setOpen] = useState(false);
    const [connections, setConnections] = useState<Connection[]>([]);

    useEffect(() => {
        loadModels();
    }, []);

    const loadModels = () => {
        // Load models from AI connections - using safe-storage
        const allConnections = storage.getItem<any[]>('ai_connections', []);

        const enabledConnections = allConnections
            .filter((c: any) => c.enabled)
            .map((c: any) => ({
                name: c.name,
                models: c.models || [],
                provider: c.provider
            }))
            .filter((c: any) => c.models.length > 0);

        setConnections(enabledConnections);
    };

    const getProviderFromId = (modelId: string): string => {
        if (modelId.includes('openai')) return 'OpenAI';
        if (modelId.includes('anthropic') || modelId.includes('claude')) return 'Anthropic';
        if (modelId.includes('google') || modelId.includes('gemini')) return 'Google';
        if (modelId.includes('deepseek')) return 'DeepSeek';
        if (modelId.includes('mistral')) return 'Mistral';
        return 'Other';
    };

    const getDisplayName = (modelId: string) => {
        if (!modelId) return 'Select a model';
        return modelId;
    };

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn('w-full justify-between', className)}
                >
                    <div className="flex items-center gap-2 truncate">
                        {value && <ModelIcon provider={getProviderFromId(value)} />}
                        <span className="truncate">{getDisplayName(value)}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search models..." />
                    <CommandList className="max-h-[300px]">
                        <CommandEmpty>No models found.</CommandEmpty>
                        {connections.length > 0 ? (
                            connections.map((conn) => (
                                <CommandGroup key={conn.name} heading={conn.name}>
                                    {Array.from(new Set(conn.models)).map((modelId) => (
                                        <CommandItem
                                            key={modelId}
                                            value={modelId}
                                            onSelect={(currentValue) => {
                                                onValueChange(currentValue === value ? '' : currentValue);
                                                setOpen(false);
                                            }}
                                        >
                                            <div className="flex items-center gap-2 flex-1">
                                                <ModelIcon provider={conn.provider} />
                                                <span className="text-sm truncate">{modelId}</span>
                                            </div>
                                            <Check
                                                className={cn(
                                                    'ml-auto h-4 w-4',
                                                    value === modelId ? 'opacity-100' : 'opacity-0'
                                                )}
                                            />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No models available. Configure your AI connections in settings.
                            </div>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function ModelIcon({ provider }: { provider?: string }) {
    const getIcon = () => {
        switch (provider) {
            case 'OpenAI':
                return '○';
            case 'Anthropic':
                return '◇';
            case 'Google':
                return '●';
            case 'DeepSeek':
                return '◉';
            default:
                return '○';
        }
    };

    return <span className="text-muted-foreground">{getIcon()}</span>;
}
