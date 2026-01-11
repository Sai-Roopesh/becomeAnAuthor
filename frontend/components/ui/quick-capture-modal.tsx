"use client";

import { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  quickCaptureSchema,
  type QuickCaptureFormData,
} from "@/shared/schemas/forms";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lightbulb } from "lucide-react";

interface QuickCaptureModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Open change handler */
  onOpenChange: (open: boolean) => void;
  /** Placeholder text for input */
  placeholder?: string;
  /** Title of the modal */
  title?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Submit handler */
  onSubmit: (value: string) => void;
  /** Optional suggestions to show */
  suggestions?: string[];
  /** Loading state */
  isSubmitting?: boolean;
}

/**
 * QuickCaptureModal - Quick input modal for capturing ideas, prompts, etc.
 *
 * Similar to Cmd+K command palette but for input rather than search.
 * Designed for:
 * - Idea capture (⌘+I)
 * - Writing prompts (/spark)
 * - Quick notes
 *
 * Features:
 * - Keyboard accessible (Escape to close, Cmd+Enter to submit)
 * - Auto-focus on open
 * - Optional suggestions
 * - Loading state for async submit
 * - Responsive: full width on mobile
 */
export function QuickCaptureModal({
  open,
  onOpenChange,
  placeholder = "Type something...",
  title = "Quick Capture",
  icon,
  onSubmit,
  suggestions = [],
  isSubmitting = false,
}: QuickCaptureModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<QuickCaptureFormData>({
    resolver: zodResolver(quickCaptureSchema),
    mode: "onChange",
  });

  const content = watch("content");

  // Reset value when modal opens
  useEffect(() => {
    if (open) {
      reset({ content: "" });
    }
  }, [open, reset]);

  const onFormSubmit = useCallback(
    (data: QuickCaptureFormData) => {
      if (!isSubmitting) {
        onSubmit(data.content);
        reset({ content: "" });
        onOpenChange(false);
      }
    },
    [isSubmitting, onSubmit, onOpenChange, reset],
  );

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(onFormSubmit)();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue("content", content ? `${content}\n${suggestion}` : suggestion, {
      shouldValidate: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit(onFormSubmit)}>
          {/* Header */}
          <DialogHeader className="px-4 py-3 border-b border-border/50 bg-muted/20">
            <DialogTitle className="flex items-center gap-2 text-base font-medium">
              <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon || <Lightbulb className="h-4 w-4" />}
              </span>
              {title}
            </DialogTitle>
          </DialogHeader>

          {/* Input area */}
          <div className="p-4">
            <Textarea
              {...register("content")}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "flex-1 resize-none",
                "border-0 focus-visible:ring-0 bg-transparent",
                "text-base placeholder:text-muted-foreground/50",
              )}
              autoFocus
            />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && !content && (
            <div className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-2">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-full",
                      "bg-muted/50 hover:bg-muted",
                      "text-muted-foreground hover:text-foreground",
                      "transition-colors",
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/50 bg-muted/10 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-2xs font-mono">
                ⌘+Enter
              </kbd>
              <span className="ml-1.5">to save</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!isValid || isSubmitting}
                className="min-w-20"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Saving...</span>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Re-export from proper hooks location for backwards compatibility
export { useQuickCapture } from "@/hooks/use-quick-capture";
