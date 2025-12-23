'use client';

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabLeader } from '@/hooks/use-tab-leader';

interface MultiTabWarningProps {
    projectId?: string;
    tabCount?: number;
    onDismiss?: () => void;
}

/**
 * Multi-Tab Warning Component
 * 
 * Can be used in two modes:
 * 1. Banner mode (with props) - Shows a dismissible warning banner
 * 2. Blocking mode (no props) - Shows full-screen block for non-leader tabs
 */
export function MultiTabWarning({ projectId, tabCount, onDismiss }: MultiTabWarningProps = {}) {
    const { isLeader, tabId } = useTabLeader();

    // Banner mode - show dismissible banner
    if (projectId && tabCount && onDismiss) {
        return (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                        This project is open in {tabCount} tabs. Changes may conflict.
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-amber-600 hover:text-amber-700 dark:text-amber-400"
                    onClick={onDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    // Blocking mode - full screen block for non-leader tabs
    if (isLeader) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full p-6 text-center">
                <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                </div>

                <h2 className="text-xl font-bold mb-2">
                    Another Tab is Active
                </h2>

                <p className="text-muted-foreground mb-4">
                    You have <strong>Become An Author</strong> open in another browser tab.
                    To prevent data conflicts, only one tab can edit at a time.
                </p>

                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-muted-foreground">
                        <strong>To continue editing:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• Close this tab, or</li>
                        <li>• Close the other tab with the app open</li>
                    </ul>
                </div>

                <p className="text-xs text-muted-foreground">
                    Tab ID: {tabId}
                </p>
            </div>
        </div>
    );
}

