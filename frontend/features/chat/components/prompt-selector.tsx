'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllPromptTemplates, PromptTemplate } from '@/shared/prompts/templates';
import { MessageSquare } from 'lucide-react';

interface PromptSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}

export function PromptSelector({ value, onValueChange, className }: PromptSelectorProps) {
    const templates = getAllPromptTemplates();

    return (
        <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger className={className}>
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <SelectValue placeholder="Select prompt" />
                </div>
            </SelectTrigger>
            <SelectContent>
                {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                        <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-muted-foreground">{template.description}</div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
