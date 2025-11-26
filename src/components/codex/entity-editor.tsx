'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/core/database';
import { CodexEntry, CodexCategory } from '@/lib/config/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export function EntityEditor({ entityId, onBack }: { entityId: string, onBack: () => void }) {
    const entity = useLiveQuery(() => db.codex.get(entityId), [entityId]);
    const [formData, setFormData] = useState<Partial<CodexEntry>>({});
    const debouncedData = useDebounce(formData, 1000);

    useEffect(() => {
        if (entity) {
            // Only set initial data if formData is empty to avoid overwriting unsaved changes if re-render happens?
            // Actually, useLiveQuery updates 'entity' when DB changes.
            // If we type, formData changes. debouncedData changes. DB updates. entity updates.
            // We need to avoid loop.
            // Standard pattern: Initialize state from props/query ONCE or when ID changes.
            // But if DB updates from another source, we might want to reflect it.
            // For now, let's just set it if formData is empty or ID changed.
            // But here we just check if name is undefined to know if initialized.
            if (!formData.id || formData.id !== entityId) {
                setFormData(entity);
            }
        }
    }, [entity, entityId]); // Removed formData dependency

    useEffect(() => {
        if (debouncedData && debouncedData.id === entityId && Object.keys(debouncedData).length > 0) {
            // Avoid updating if it matches entity exactly?
            // For simplicity, just update.
            db.codex.update(entityId, { ...debouncedData, updatedAt: Date.now() } as any);
        }
    }, [debouncedData, entityId]);

    const [isGenerating, setIsGenerating] = useState(false);

    const generateDescription = async () => {
        if (!formData.name || !formData.category) return;
        setIsGenerating(true);

        const apiKey = localStorage.getItem('openrouter_api_key');
        const model = localStorage.getItem('openrouter_model') || 'openai/gpt-3.5-turbo';

        if (!apiKey) {
            alert('Please set your API Key in settings.');
            setIsGenerating(false);
            return;
        }

        try {
            const prompt = `Generate a creative and detailed description for a ${formData.category} named "${formData.name}". 
        ${formData.aliases?.length ? `Aliases: ${formData.aliases.join(', ')}.` : ''}
        Write about 2-3 paragraphs.`;

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'OpenSource Novel Writer',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            const data = await response.json();
            const description = data.choices[0]?.message?.content || '';

            if (description) {
                handleChange('description', (formData.description ? formData.description + '\n\n' : '') + description);
            }
        } catch (error) {
            console.error('Generation failed', error);
            alert('Failed to generate description.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleChange = (field: keyof CodexEntry, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this entity?')) {
            await db.codex.delete(entityId);
            onBack();
        }
    };

    if (!entity) return <div className="p-4">Loading...</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={formData.category} onValueChange={v => handleChange('category', v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="character">Character</SelectItem>
                            <SelectItem value="location">Location</SelectItem>
                            <SelectItem value="item">Item</SelectItem>
                            <SelectItem value="lore">Lore</SelectItem>
                            <SelectItem value="subplot">Subplot</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Aliases (comma separated)</label>
                    <Input
                        value={formData.aliases?.join(', ') || ''}
                        onChange={e => handleChange('aliases', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium">Description</label>
                        <Button variant="outline" size="sm" onClick={generateDescription} disabled={isGenerating}>
                            {isGenerating ? 'Generating...' : 'Auto-Generate'}
                        </Button>
                    </div>
                    <Textarea
                        className="min-h-[200px]"
                        value={formData.description || ''}
                        onChange={e => handleChange('description', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
