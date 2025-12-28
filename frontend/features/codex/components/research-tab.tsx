'use client';

import { CodexEntry } from '@/domain/entities/types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, ExternalLink, X } from 'lucide-react';
import { usePrompt } from '@/hooks/use-prompt';

interface ResearchTabProps {
    entity: Partial<CodexEntry>;
    onChange: (field: keyof CodexEntry, value: CodexEntry[keyof CodexEntry]) => void;
}

export function ResearchTab({ entity, onChange }: ResearchTabProps) {
    const { prompt, PromptDialog } = usePrompt();

    const addLink = async () => {
        const url = await prompt({
            title: 'Add Research Link',
            description: 'Enter a URL to add to your research:',
            placeholder: 'https://example.com'
        });
        if (url) {
            const links = entity.externalLinks || [];
            onChange('externalLinks', [...links, url]);
        }
    };

    const removeLink = (index: number) => {
        const links = entity.externalLinks || [];
        onChange('externalLinks', links.filter((_, i) => i !== index));
    };

    return (
        <div className="max-w-3xl space-y-6">
            {/* Notes */}
            <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <p className="text-xs text-muted-foreground">
                    Private notes not seen by AI. Use this for additional information, physical descriptions, or editing notes.
                </p>
                <Textarea
                    className="flex-1"
                    value={entity.notes || ''}
                    onChange={e => onChange('notes', e.target.value)}
                    placeholder="Add research notes..."
                />
            </div>

            {/* External Links */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">External Links</label>
                    <Button variant="outline" size="sm" onClick={addLink}>
                        <Plus className="h-3 w-3 mr-1" /> Add Link
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    Reference images, character sheets, inspiration, etc.
                </p>

                {entity.externalLinks && entity.externalLinks.length > 0 ? (
                    <div className="space-y-2">
                        {entity.externalLinks.map((link, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded hover:bg-accent">
                                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 text-sm text-primary hover:underline truncate"
                                >
                                    {link}
                                </a>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => removeLink(index)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                        No external links yet
                    </div>
                )}
            </div>

            <PromptDialog />
        </div>
    );
}
