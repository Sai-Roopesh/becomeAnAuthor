'use client';

import { Input } from './input';
import { Badge } from './badge';
import { X } from 'lucide-react';
import { useState, KeyboardEvent } from 'react';

interface TagInputProps {
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    className?: string;
}

/**
 * TagInput Component
 * Allows users to add/remove tags by typing and pressing Enter
 * Used in ArcPointEditor for knowledge state, mental state, etc.
 */
export function TagInput({ values, onChange, placeholder, className }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!values.includes(inputValue.trim())) {
                onChange([...values, inputValue.trim()]);
            }
            setInputValue('');
        } else if (e.key === 'Backspace' && !inputValue && values.length > 0) {
            // Remove last tag on backspace if input is empty
            e.preventDefault();
            onChange(values.slice(0, -1));
        }
    };

    const removeTag = (index: number) => {
        onChange(values.filter((_, i) => i !== index));
    };

    return (
        <div className={`space-y-2 ${className || ''}`}>
            <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || 'Type and press Enter...'}
                className="w-full"
            />
            {values.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {values.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="gap-1 pr-1">
                            <span>{tag}</span>
                            <button
                                type="button"
                                onClick={() => removeTag(index)}
                                className="ml-1 hover:text-destructive transition-colors"
                                aria-label={`Remove ${tag}`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
