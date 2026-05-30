"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * ErrorState — inline panel error component.
 *
 * Displays an error icon, an optional title, the error message, and an
 * optional "Try again" retry button. Intentionally compact — not a full-page
 * error; intended for use inside feature panels and list areas.
 *
 * @example
 * <ErrorState
 *   title="Failed to load scenes"
 *   message="Could not reach the database. Check your connection and try again."
 *   onRetry={() => refetch()}
 * />
 */
export function ErrorState({
  title,
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        "py-10 px-6 text-center",
        "animate-in fade-in duration-300",
        className,
      )}
    >
      {/* Icon */}
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-1">
        {/* Optional title */}
        {title && (
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        )}

        {/* Message */}
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          {message}
        </p>
      </div>

      {/* Optional retry button */}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="min-h-9"
        >
          Try again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
