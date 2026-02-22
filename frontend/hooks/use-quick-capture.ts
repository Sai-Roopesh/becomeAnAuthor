"use client";

import { useState, useEffect } from "react";

interface UseQuickCaptureOptions {
  enabled?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  ignoreWhenTyping?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;

  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;

  return Boolean(
    target.closest(
      '[contenteditable="true"], .ProseMirror, [role="textbox"], [data-no-global-shortcuts="true"]',
    ),
  );
}

/**
 * Hook to open QuickCaptureModal with keyboard shortcut
 *
 * Extracted from quick-capture-modal.tsx per CODING_GUIDELINES
 * hooks belong in frontend/hooks/
 *
 * @param key - The key to listen for (e.g., "i")
 * @returns Object with isOpen state and control functions
 *
 * @example
 * const { isOpen, open, close, setIsOpen } = useQuickCapture("i", { shiftKey: true });
 */
export function useQuickCapture(
  key: string,
  options: UseQuickCaptureOptions = {},
) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    enabled = true,
    shiftKey = false,
    altKey = false,
    ignoreWhenTyping = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (ignoreWhenTyping && isTypingTarget(event.target)) return;

      const isModPressed = event.metaKey || event.ctrlKey;
      if (!isModPressed) return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (event.shiftKey !== shiftKey) return;
      if (event.altKey !== altKey) return;

      event.preventDefault();
      setIsOpen(true);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [altKey, enabled, ignoreWhenTyping, key, shiftKey]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
    setIsOpen,
  };
}
