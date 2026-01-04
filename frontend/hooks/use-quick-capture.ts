'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to open QuickCaptureModal with keyboard shortcut
 * 
 * Extracted from quick-capture-modal.tsx per CODING_GUIDELINES
 * hooks belong in frontend/hooks/
 * 
 * @param key - The key to listen for (e.g., 'i' for Cmd+I)
 * @returns Object with isOpen state and control functions
 * 
 * @example
 * const { isOpen, open, close, setIsOpen } = useQuickCapture('i');
 */
export function useQuickCapture(key: string) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Cmd+key (Mac) or Ctrl+key (Windows/Linux)
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key.toLowerCase()) {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [key]);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev),
        setIsOpen,
    };
}
