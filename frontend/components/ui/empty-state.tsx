'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type EmptyStateVariant = 'default' | 'minimal' | 'hero';

interface EmptyStateAction {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'outline' | 'ghost';
}

interface EmptyStateProps {
    /** Icon to display */
    icon: React.ReactNode;
    /** Title text */
    title: string;
    /** Optional description */
    description?: string;
    /** Optional action button */
    action?: EmptyStateAction;
    /** Visual variant */
    variant?: EmptyStateVariant;
    /** Additional class names */
    className?: string;
}

/**
 * EmptyState - Reusable empty state component
 * 
 * Variants:
 * - `default`: Icon + title + description + optional button
 * - `minimal`: Just icon + one-line text (for small panels)
 * - `hero`: Large centered display with blur effects (for full pages)
 * 
 * Follows responsive design guidelines:
 * - Uses flexbox for centering
 * - Responsive text sizes (sm:text-2xl)
 * - Touch-friendly buttons (min-h-11)
 * - No hardcoded pixel values
 * 
 * @example
 * // Hero variant for full pages
 * <EmptyState
 *   variant="hero"
 *   icon={<Sparkles className="h-10 w-10" />}
 *   title="No Analyses Yet"
 *   description="Run your first story analysis..."
 *   action={{
 *     label: "Run Analysis",
 *     onClick: () => setRunDialogOpen(true),
 *     icon: <PlayCircle className="h-4 w-4" />
 *   }}
 * />
 * 
 * // Minimal variant for small panels
 * <EmptyState
 *   variant="minimal"
 *   icon={<FileText className="h-6 w-6" />}
 *   title="No scenes yet"
 * />
 */
export function EmptyState({
    icon,
    title,
    description,
    action,
    variant = 'default',
    className,
}: EmptyStateProps) {
    if (variant === 'minimal') {
        return (
            <div
                className={cn(
                    "flex flex-col items-center justify-center h-32",
                    "text-center text-muted-foreground",
                    "animate-in fade-in duration-300",
                    className
                )}
            >
                <div className="mb-2 text-muted-foreground/60">
                    {icon}
                </div>
                <p className="text-xs">{title}</p>
            </div>
        );
    }

    if (variant === 'hero') {
        return (
            <div
                className={cn(
                    "flex flex-col items-center justify-center h-full",
                    "p-8 text-center",
                    "animate-in fade-in zoom-in duration-500",
                    className
                )}
            >
                {/* Icon with glow effect */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl opacity-50" />
                    <div className="relative h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {icon}
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">
                    {title}
                </h2>

                {/* Description */}
                {description && (
                    <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
                        {description}
                    </p>
                )}

                {/* Action button */}
                {action && (
                    <Button
                        onClick={action.onClick}
                        variant={action.variant || 'default'}
                        className="min-h-11 px-6 rounded-full"
                    >
                        {action.icon && <span className="mr-2">{action.icon}</span>}
                        {action.label}
                    </Button>
                )}
            </div>
        );
    }

    // Default variant
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center",
                "py-12 px-6 text-center",
                "animate-in fade-in duration-300",
                className
            )}
        >
            {/* Icon */}
            <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-4">
                {icon}
            </div>

            {/* Title */}
            <h3 className="text-base font-medium text-foreground mb-1">
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                    {description}
                </p>
            )}

            {/* Action button */}
            {action && (
                <Button
                    onClick={action.onClick}
                    variant={action.variant || 'outline'}
                    size="sm"
                    className="min-h-9"
                >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                </Button>
            )}
        </div>
    );
}
