'use client';

import { useEffect, useState } from 'react';
import { Check, AlertCircle, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/lib/core/editor-state-manager';

interface SaveStatusIndicatorProps {
    status: SaveStatus;
    lastSaved?: number;
    className?: string;
}

export function SaveStatusIndicator({ status, lastSaved, className }: SaveStatusIndicatorProps) {
    const [relativeTime, setRelativeTime] = useState<string>('');

    useEffect(() => {
        if (!lastSaved) return;

        const updateRelativeTime = () => {
            const seconds = Math.floor((Date.now() - lastSaved) / 1000);
            if (seconds < 5) {
                setRelativeTime('just now');
            } else if (seconds < 60) {
                setRelativeTime(`${seconds}s ago`);
            } else if (seconds < 3600) {
                setRelativeTime(`${Math.floor(seconds / 60)}m ago`);
            } else {
                setRelativeTime(`${Math.floor(seconds / 3600)}h ago`);
            }
        };

        updateRelativeTime();
        const interval = setInterval(updateRelativeTime, 1000);

        return () => clearInterval(interval);
    }, [lastSaved]);

    const getContent = () => {
        switch (status) {
            case 'saved':
                return {
                    icon: <Check className="h-3.5 w-3.5" />,
                    text: lastSaved ? `Saved ${relativeTime}` : 'Saved',
                    color: 'text-green-600 dark:text-green-400',
                };
            case 'saving':
                return {
                    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
                    text: 'Saving...',
                    color: 'text-blue-600 dark:text-blue-400',
                };
            case 'unsaved':
                return {
                    icon: <Circle className="h-3.5 w-3.5 fill-current" />,
                    text: 'Unsaved changes',
                    color: 'text-orange-600 dark:text-orange-400',
                };
            case 'error':
                return {
                    icon: <AlertCircle className="h-3.5 w-3.5" />,
                    text: 'Save failed',
                    color: 'text-red-600 dark:text-red-400',
                };
        }
    };

    const content = getContent();

    return (
        <div className={cn('flex items-center gap-1.5 text-xs', content.color, className)}>
            {content.icon}
            <span>{content.text}</span>
        </div>
    );
}
