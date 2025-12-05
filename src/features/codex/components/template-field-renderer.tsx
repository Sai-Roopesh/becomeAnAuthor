'use client';

import type { CodexTemplate, TemplateField } from '@/lib/config/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface TemplateFieldRendererProps {
    template: CodexTemplate;
    values: Record<string, any>;
    onChange: (fieldId: string, value: any) => void;
}

/**
 * Template Field Renderer Component
 * 
 * Renders dynamic form fields based on template definition
 * 
 * ✅ ARCHITECTURE COMPLIANCE:
 * - 'use client' directive
 * - Type-safe props
 * - Feature component location
 */
export function TemplateFieldRenderer({
    template,
    values,
    onChange
}: TemplateFieldRendererProps) {
    const renderField = (field: TemplateField) => {
        const value = values[field.id] ?? field.defaultValue ?? '';

        switch (field.type) {
            case 'text':
                return (
                    <Input
                        placeholder={field.placeholder}
                        value={value as string}
                        onChange={e => onChange(field.id, e.target.value)}
                    />
                );

            case 'textarea':
                return (
                    <Textarea
                        placeholder={field.placeholder}
                        value={value as string}
                        onChange={e => onChange(field.id, e.target.value)}
                        rows={4}
                    />
                );

            case 'number':
                return (
                    <Input
                        type="number"
                        placeholder={field.placeholder}
                        value={value as number}
                        onChange={e => onChange(field.id, parseFloat(e.target.value) || 0)}
                        min={field.min}
                        max={field.max}
                    />
                );

            case 'select':
                return (
                    <Select
                        value={value as string}
                        onValueChange={v => onChange(field.id, v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={field.placeholder || 'Select...'} />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map(option => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case 'slider':
                return (
                    <div className="space-y-2">
                        <Slider
                            value={[value as number || field.min || 0]}
                            onValueChange={([v]) => onChange(field.id, v)}
                            min={field.min || 0}
                            max={field.max || 100}
                            step={1}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {value || field.min || 0}
                        </p>
                    </div>
                );

            default:
                return (
                    <Input
                        placeholder={field.placeholder}
                        value={value as string}
                        onChange={e => onChange(field.id, e.target.value)}
                    />
                );
        }
    };

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                    Template: {template.name}
                </h3>
            </div>

            {template.fields.map(field => (
                <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                        {field.name}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                    {field.helperText && (
                        <p className="text-xs text-muted-foreground">
                            {field.helperText}
                        </p>
                    )}
                </div>
            ))}

            {template.fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    This template has no fields defined.
                </p>
            )}
        </div>
    );
}
