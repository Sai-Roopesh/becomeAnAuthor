'use client';

import { CodexEntry } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Copy, History, Sparkles } from 'lucide-react';
import { generateText } from '@/lib/ai-service';
import { toast } from '@/lib/toast-service';
import { storage } from '@/lib/safe-storage';
import { STORAGE_KEYS } from '@/lib/constants';

interface DetailsTabProps {
    entity: Partial<CodexEntry>;
    onChange: (field: keyof CodexEntry, value: any) => void;
}

export function DetailsTab({ entity, onChange }: DetailsTabProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const generateDescription = async () => {
        if (!entity.name || !entity.category) return;
        setIsGenerating(true);

        const model = storage.getItem<string>(STORAGE_KEYS.LAST_USED_MODEL, '');

        if (!model) {
            toast.error('Please select a model in settings or chat to use AI features.');
            setIsGenerating(false);
            return;
        }

        try {
            const prompt = `Generate a creative and detailed description for a ${entity.category} named "${entity.name}". 
        ${entity.aliases?.length ? `Aliases: ${entity.aliases.join(', ')}.` : ''}
        Write about 2-3 paragraphs.`;

            const response = await generateText({
                model,
                system: 'You are a helpful creative writing assistant specializing in world-building.',
                prompt,
                maxTokens: 1000,
            });

            const description = response.text;

            if (description) {
                onChange('description', (entity.description ? entity.description + '\n\n' : '') + description);
            }
        } catch (error) {
            console.error('Generation failed', error);
            toast.error(`Failed to generate description: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const wordCount = entity.description?.split(/\s+/).filter(Boolean).length || 0;

    return (
        <div className="max-w-3xl space-y-6">
            {/* Aliases */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Aliases/Nicknames</label>
                <Input
                    value={entity.aliases?.join(', ') || ''}
                    onChange={e => onChange('aliases', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Add aliases..."
                />
                <p className="text-xs text-muted-foreground">
                    Separate multiple aliases with commas
                </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Description</label>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                            <History className="h-3 w-3 mr-1" /> History
                        </Button>
                        <Button variant="ghost" size="sm">
                            <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={generateDescription} disabled={isGenerating}>
                            <Sparkles className="h-3 w-3 mr-1" />
                            {isGenerating ? 'Generating...' : 'Auto-Generate'}
                        </Button>
                    </div>
                </div>
                <Textarea
                    className="min-h-[300px] font-mono text-sm"
                    value={entity.description || ''}
                    onChange={e => onChange('description', e.target.value)}
                    placeholder="Describe this entry..."
                />
                <p className="text-xs text-muted-foreground">
                    {wordCount} words
                </p>
            </div>

            {/* Custom Details */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Custom Details</label>
                    <Button variant="outline" size="sm">
                        + Add Detail
                    </Button>
                </div>
                <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                    No custom details yet. Create custom fields to organize your entry.
                </div>
            </div>
        </div>
    );
}
