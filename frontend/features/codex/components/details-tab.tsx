'use client';

import { CodexEntry } from '@/lib/config/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Copy, History, Sparkles, Upload, Plus, Trash2 } from 'lucide-react';
import { useAI } from '@/hooks/use-ai';
import { toast } from '@/shared/utils/toast-service';

interface DetailsTabProps {
    entity: Partial<CodexEntry>;
    onChange: (field: keyof CodexEntry, value: any) => void;
}

export function DetailsTab({ entity, onChange }: DetailsTabProps) {
    const [newAttrKey, setNewAttrKey] = useState('');
    const [newAttrValue, setNewAttrValue] = useState('');
    const { generate, isGenerating } = useAI({
        system: 'You are a helpful creative writing assistant specializing in world-building.',
        streaming: false,
        operationName: 'Codex Description Generation',
    });

    const generateDescription = async () => {
        if (!entity.name || !entity.category) return;

        const getCategoryGuidance = (category: string) => {
            switch (category.toLowerCase()) {
                case 'character':
                    return `FOCUS: Physical traits, personality, mannerisms, and role in story
- Opening Hook: Most striking feature
- Physical Description: Appearance and mannerisms
- Personality: Core traits and motivations
- Story Role: How they fit the narrative`;
                case 'location':
                case 'place':
                    return `FOCUS: Sensory details, atmosphere, and significance
- Visual: What dominates the space
- Atmosphere: Mood and feeling
- Function: Purpose in the story
- Details: Distinctive features`;
                case 'item':
                case 'object':
                    return `FOCUS: Appearance, function, and significance
- Appearance: What it looks like
- Function: What it does or represents
- Origin: Where it came from
- Significance: Why it matters`;
                default:
                    return `FOCUS: Key defining features and story relevance
- Core Identity: What makes this unique
- Description: Vivid details
- Function/Role: Purpose in the story`;
            }
        };

        const prompt = `Generate a detailed ${entity.category} description for "${entity.name}".
${entity.aliases?.length ? `\nAliases: ${entity.aliases.join(', ')}` : ''}

OUTPUT FORMAT:
${getCategoryGuidance(entity.category)}

STYLE:
- Tone: ${entity.category === 'character' ? 'Intimate, revealing personality' : 'Immersive, world-building'}
- Length: 150-200 words (2-3 paragraphs)
- Avoid: Clichés, generic descriptions, backstory dumps

EXAMPLE (Character):
"Marcus never made eye contact. His gaze flicked sideways, cataloging exits. Forty-two, wiry, with calloused hands that never stopped moving—tapping, drumming, checking his watch.

A fixer, they called him. The man who made problems disappear. But the tremor in his left hand told a different story. Nightmares, Mai guessed. The kind that came from fixing too many problems the hard way."

Generate now for: ${entity.name} (${entity.category})`;

        const description = await generate({
            prompt,
            maxTokens: 500,
        });

        if (description) {
            onChange('description', (entity.description ? entity.description + '\n\n' : '') + description);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onChange('thumbnail', reader.result as string);
                toast.success('Image uploaded');
            };
            reader.readAsDataURL(file);
        }
    };

    const addAttribute = () => {
        if (newAttrKey && newAttrValue) {
            const newAttributes = { ...entity.attributes, [newAttrKey]: newAttrValue };
            onChange('attributes', newAttributes);
            setNewAttrKey('');
            setNewAttrValue('');
        }
    };

    const removeAttribute = (key: string) => {
        const newAttributes = { ...entity.attributes };
        delete newAttributes[key];
        onChange('attributes', newAttributes);
    };

    const wordCount = entity.description?.split(/\s+/).filter(Boolean).length || 0;

    return (
        <div className="max-w-3xl space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Thumbnail Image</label>
                <div className="flex items-center gap-4">
                    <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                        {entity.thumbnail ? (
                            <img src={entity.thumbnail} alt="Thumbnail" className="h-full w-full object-cover" />
                        ) : (
                            <div className="text-xs text-muted-foreground">No Image</div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Input
                            type="file"
                            accept="image/*"
                            className="w-full max-w-xs"
                            onChange={handleImageUpload}
                        />
                        <p className="text-xs text-muted-foreground">
                            Upload a small image to represent this entity.
                        </p>
                    </div>
                </div>
            </div>

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

            {/* Attributes */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Attributes</label>
                <div className="border rounded-lg p-4 space-y-4">
                    {/* List */}
                    <div className="space-y-2">
                        {Object.entries(entity.attributes || {}).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                                <div className="w-1/3 text-sm font-medium bg-muted/50 px-2 py-1 rounded">{key}</div>
                                <div className="flex-1 text-sm px-2 py-1">{value}</div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeAttribute(key)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                        {Object.keys(entity.attributes || {}).length === 0 && (
                            <div className="text-sm text-muted-foreground text-center py-2">
                                No attributes yet.
                            </div>
                        )}
                    </div>

                    {/* Add New */}
                    <div className="flex gap-2 pt-2 border-t">
                        <Input
                            placeholder="Key (e.g. Age)"
                            value={newAttrKey}
                            onChange={e => setNewAttrKey(e.target.value)}
                            className="w-1/3"
                        />
                        <Input
                            placeholder="Value (e.g. 25)"
                            value={newAttrValue}
                            onChange={e => setNewAttrValue(e.target.value)}
                            className="flex-1"
                        />
                        <Button size="sm" onClick={addAttribute} disabled={!newAttrKey || !newAttrValue}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
