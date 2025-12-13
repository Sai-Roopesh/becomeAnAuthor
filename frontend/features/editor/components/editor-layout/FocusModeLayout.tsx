'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { X } from 'lucide-react';
import { TiptapEditor } from '../tiptap-editor';
import type { DocumentNode } from '@/lib/config/types';

interface FocusModeLayoutProps {
    activeScene: DocumentNode;
    projectId: string;
    editorWordCount: number;
    onWordCountChange: (count: number) => void;
    onExitFocusMode: () => void;
}

/**
 * Focus Mode Layout - Full-screen distraction-free writing.
 */
export function FocusModeLayout({
    activeScene,
    projectId,
    editorWordCount,
    onWordCountChange,
    onExitFocusMode,
}: FocusModeLayoutProps) {
    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Focus Mode Header - Minimal */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
                <span className="text-xs text-muted-foreground">
                    {editorWordCount.toLocaleString()} words
                </span>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExitFocusMode}>
                            <X className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Exit Focus Mode (Esc)</TooltipContent>
                </Tooltip>
            </div>

            {/* Centered Editor */}
            <div className="flex-1 overflow-y-auto flex justify-center pt-16 pb-32">
                <div className="w-full max-w-3xl px-8">
                    <TiptapEditor
                        sceneId={activeScene.id}
                        projectId={projectId}
                        content={'content' in activeScene ? activeScene.content : { type: 'doc', content: [] }}
                        onWordCountChange={onWordCountChange}
                    />
                </div>
            </div>

            {/* Bottom hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> to exit focus mode
            </div>
        </div>
    );
}
