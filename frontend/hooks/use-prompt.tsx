"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PromptOptions {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | null; // Return error message or null if valid
  allowEmpty?: boolean; // Default: false
  preserveWhitespace?: boolean; // Default: false (trims whitespace)
}

interface PromptState {
  isOpen: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  inputValue: string;
  errorMessage: string | null;
  validate?: (value: string) => string | null;
  allowEmpty: boolean;
  preserveWhitespace: boolean;
}

interface QueueItem {
  id: string;
  options: PromptOptions;
  resolve: (value: string | null) => void;
}

// C-2 fix: PromptDialogComponent is defined OUTSIDE the hook so it has
// stable component identity regardless of state changes. React will never
// unmount + remount it on re-renders, preventing the input-focus loss.
interface PromptDialogProps {
  state: PromptState;
  onConfirm: () => void;
  onCancel: () => void;
  onInputChange: (v: string) => void;
  onOpenChange: (open: boolean) => void;
}

function PromptDialogComponent({
  state,
  onConfirm,
  onCancel,
  onInputChange,
  onOpenChange,
}: PromptDialogProps) {
  return (
    <Dialog open={state.isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          {state.description && (
            <DialogDescription>{state.description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Input
            value={state.inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={state.placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onConfirm();
              } else if (e.key === "Escape") {
                onCancel();
              }
            }}
            autoFocus
            className={state.errorMessage ? "border-destructive" : ""}
          />
          {state.errorMessage && (
            <p className="text-sm text-destructive">{state.errorMessage}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function usePrompt() {
  const [state, setState] = useState<PromptState>({
    isOpen: false,
    title: "",
    description: "",
    placeholder: "",
    inputValue: "",
    errorMessage: null,
    allowEmpty: false,
    preserveWhitespace: false,
  });

  // Queue for managing multiple concurrent prompt requests
  const queueRef = useRef<QueueItem[]>([]);
  const activeItemRef = useRef<QueueItem | null>(null);
  const isMountedRef = useRef(true);

  // C-1 fix: Keep a ref that is always current so the cleanup-only effect
  // below can read the latest state without being listed as a dependency.
  const stateRef = useRef(state);
  stateRef.current = state; // Updated every render, outside the effect.

  // C-1 fix: Single cleanup-only effect with [] deps. React runs cleanup
  // ONLY on unmount, so activeItemRef.current.resolve(null) is never
  // called on every keystroke.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const currentState = stateRef.current;
      if (activeItemRef.current && currentState.inputValue) {
        // User typed something - preserve it
        const finalValue = currentState.preserveWhitespace
          ? currentState.inputValue
          : currentState.inputValue.trim();
        activeItemRef.current.resolve(finalValue || null);
        activeItemRef.current = null;
      } else if (activeItemRef.current) {
        // No input - resolve as cancelled
        activeItemRef.current.resolve(null);
        activeItemRef.current = null;
      }
      // Clear queue - resolve all as cancelled (no user input to preserve)
      queueRef.current.forEach((item) => item.resolve(null));
      queueRef.current = [];
    };
  }, []); // empty deps — cleanup runs only on unmount

  const processNextInQueue = useCallback(() => {
    if (!isMountedRef.current) return;

    if (queueRef.current.length > 0) {
      const nextItem = queueRef.current.shift()!;
      activeItemRef.current = nextItem;

      setState({
        isOpen: true,
        title: nextItem.options.title,
        ...(nextItem.options.description && {
          description: nextItem.options.description,
        }),
        ...(nextItem.options.placeholder && {
          placeholder: nextItem.options.placeholder,
        }),
        inputValue: nextItem.options.defaultValue || "",
        errorMessage: null,
        ...(nextItem.options.validate && {
          validate: nextItem.options.validate,
        }),
        allowEmpty: nextItem.options.allowEmpty ?? false,
        preserveWhitespace: nextItem.options.preserveWhitespace ?? false,
      });
    } else {
      activeItemRef.current = null;
    }
  }, []);

  const prompt = useCallback(
    (options: PromptOptions): Promise<string | null> => {
      return new Promise((resolve) => {
        const item: QueueItem = {
          id: crypto.randomUUID(),
          options,
          resolve,
        };

        // If no dialog is currently active, show immediately
        if (!activeItemRef.current) {
          activeItemRef.current = item;
          setState({
            isOpen: true,
            title: options.title,
            ...(options.description && { description: options.description }),
            ...(options.placeholder && { placeholder: options.placeholder }),
            inputValue: options.defaultValue || "",
            errorMessage: null,
            ...(options.validate && { validate: options.validate }),
            allowEmpty: options.allowEmpty ?? false,
            preserveWhitespace: options.preserveWhitespace ?? false,
          });
        } else {
          // Queue it for later
          queueRef.current.push(item);
        }
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    if (!activeItemRef.current) return;

    const currentState = stateRef.current;
    const processedValue = currentState.preserveWhitespace
      ? currentState.inputValue
      : currentState.inputValue.trim();

    // Validate if validator is provided
    if (currentState.validate) {
      const error = currentState.validate(processedValue);
      if (error) {
        setState((prev) => ({ ...prev, errorMessage: error }));
        return; // Don't close dialog, show error
      }
    }

    // Check if empty and not allowed
    if (!processedValue && !currentState.allowEmpty) {
      setState((prev) => ({ ...prev, errorMessage: "This field is required" }));
      return;
    }

    // All good - resolve and close
    activeItemRef.current.resolve(processedValue || null);
    activeItemRef.current = null;
    setState((prev) => ({ ...prev, isOpen: false, errorMessage: null }));
    // Queue processing happens in onOpenChange when dialog fully closes
  }, []); // stable — reads state via stateRef.current

  const handleCancel = useCallback(() => {
    if (activeItemRef.current) {
      activeItemRef.current.resolve(null);
      activeItemRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isOpen: false,
      inputValue: "",
      errorMessage: null,
    }));
    // Queue processing happens in onOpenChange when dialog fully closes
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setState((prev) => ({ ...prev, inputValue: value, errorMessage: null }));
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleCancel();
        processNextInQueue();
      }
    },
    [handleCancel, processNextInQueue],
  );

  // C-2 fix: PromptDialog is a stable closure that always renders the same
  // PromptDialogComponent class (defined outside the hook). Only the props
  // object changes on re-renders; React never unmounts the component tree.
  const PromptDialog = useCallback(
    () => (
      <PromptDialogComponent
        state={state}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onInputChange={handleInputChange}
        onOpenChange={handleOpenChange}
      />
    ),
    [state, handleConfirm, handleCancel, handleInputChange, handleOpenChange],
  );

  return { prompt, PromptDialog };
}
