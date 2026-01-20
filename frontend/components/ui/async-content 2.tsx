'use client';

import { Loader2, AlertCircle, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

interface AsyncContentProps<T> {
    /** The data to render when loaded */
    data: T | undefined | null;
    /** Whether data is currently loading */
    isLoading: boolean;
    /** Error message if fetch failed */
    error?: string | null;
    /** Loading state message */
    loadingMessage?: string;
    /** Empty state message */
    emptyMessage?: string;
    /** Empty state description */
    emptyDescription?: string;
    /** Function to determine if data is empty */
    isEmpty?: (data: T) => boolean;
    /** Retry function for error state */
    onRetry?: () => void;
    /** Render function for loaded data */
    children: (data: T) => React.ReactNode;
}

/**
 * AsyncContent - Unified loading/error/empty state wrapper
 * 
 * Reduces nested ternary conditionals by providing a single component
 * that handles all async data states.
 * 
 * @example
 * <AsyncContent
 *     data={models}
 *     isLoading={isLoading}
 *     error={error}
 *     isEmpty={(m) => m.length === 0}
 *     emptyMessage="No models available"
 * >
 *     {(models) => <ModelGrid models={models} />}
 * </AsyncContent>
 */
export function AsyncContent<T>({
    data,
    isLoading,
    error,
    loadingMessage = 'Loading...',
    emptyMessage = 'No data available',
    emptyDescription,
    isEmpty,
    onRetry,
    children,
}: AsyncContentProps<T>) {
    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{loadingMessage}</span>
            </div>
        );
    }

    // Error state
    if (error && (!data || (isEmpty && isEmpty(data)))) {
        return (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span>Failed to load</span>
                <span className="text-xs">{error}</span>
                {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
                        Retry
                    </Button>
                )}
            </div>
        );
    }

    // Empty state
    if (!data || (isEmpty && isEmpty(data))) {
        return (
            <EmptyState
                icon={<FileX className="h-12 w-12" />}
                title={emptyMessage}
                {...(emptyDescription && { description: emptyDescription })}
            />
        );
    }

    // Success - render children with data
    return <>{children(data)}</>;
}
