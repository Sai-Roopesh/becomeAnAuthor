'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Save } from 'lucide-react';

interface EntityEditorHeaderProps {
    onBack: () => void;
    onSave: () => void;
    onDelete: () => void;
}

/**
 * Header component for EntityEditor with navigation and action buttons.
 * Extracted from entity-editor.tsx for better maintainability.
 */
export function EntityEditorHeader({ onBack, onSave, onDelete }: EntityEditorHeaderProps) {
    return (
        <div className="p-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onSave} title="Save (auto-saves after 1s)">
                    <Save className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete} title="Delete entity">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
