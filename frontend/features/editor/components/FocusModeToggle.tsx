'use client';

import { Button } from '@/components/ui/button';
import { useFormatStore } from '@/store/use-format-store';
import { Maximize2, Minimize2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface FocusModeToggleProps {
    hasActiveScene?: boolean;
}

export function FocusModeToggle({ hasActiveScene = false }: FocusModeToggleProps) {
    const { focusMode, toggleFocusMode } = useFormatStore();

    const handleClick = () => {
        if (hasActiveScene) {
            toggleFocusMode();
        }
    };

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClick}
                        disabled={!hasActiveScene && !focusMode}
                        className="gap-2"
                    >
                        {focusMode ? (
                            <Minimize2 className="h-4 w-4" />
                        ) : (
                            <Maximize2 className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                            {focusMode ? 'Exit Focus' : 'Focus'}
                        </span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="flex items-center gap-2">
                        <span>
                            {!hasActiveScene && !focusMode
                                ? 'Select a scene to use Focus Mode'
                                : focusMode
                                    ? 'Exit Focus Mode'
                                    : 'Enter Focus Mode'}
                        </span>
                        {hasActiveScene && <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘⇧F</kbd>}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

