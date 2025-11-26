'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MultiTabWarningProps {
    projectId: string;
    tabCount: number;
    onDismiss?: () => void;
}

/**
 * Warning banner shown when same project is open in multiple tabs
 */
export function MultiTabWarning({ projectId, tabCount, onDismiss }: MultiTabWarningProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const handleDismiss = () => {
        setDismissed(true);
        onDismiss?.();
    };

    return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 flex-1">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-destructive mb-1">
                            ⚠️ Multiple Tabs Detected
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                            This project is open in <strong>{tabCount} browser tabs</strong>.
                            Editing in multiple tabs can cause data conflicts and loss.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            <strong>Recommendation:</strong> Close other tabs with this project to avoid conflicts.
                            Changes made in one tab may overwrite changes in another.
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={handleDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
