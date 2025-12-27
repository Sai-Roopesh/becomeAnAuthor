'use client';

/**
 * useSceneNote Hook
 * 
 * Manages per-scene notes with auto-save functionality.
 * Follows the existing hook patterns in the codebase.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppServices } from '@/infrastructure/di/AppContext';
import type { SceneNote } from '@/domain/entities/types';
import type { TiptapContent } from '@/shared/types/tiptap';

interface UseSceneNoteOptions {
    sceneId: string | null;
    projectId: string;
    autoSaveDelay?: number;
}

interface UseSceneNoteReturn {
    note: SceneNote | null;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    updateContent: (content: TiptapContent) => void;
    saveNote: () => Promise<void>;
    deleteNote: () => Promise<void>;
}

const EMPTY_CONTENT: TiptapContent = { type: 'doc', content: [] };

export function useSceneNote({
    sceneId,
    projectId,
    autoSaveDelay = 1000,
}: UseSceneNoteOptions): UseSceneNoteReturn {
    const { sceneNoteRepository } = useAppServices();
    const [note, setNote] = useState<SceneNote | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track pending content for auto-save
    const pendingContentRef = useRef<TiptapContent | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load note when sceneId changes
    useEffect(() => {
        if (!sceneId) {
            setNote(null);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        sceneNoteRepository.getBySceneId(sceneId)
            .then((existingNote) => {
                if (cancelled) return;
                if (existingNote) {
                    setNote(existingNote);
                } else {
                    // Create empty note structure
                    setNote({
                        id: crypto.randomUUID(),
                        sceneId,
                        projectId,
                        content: EMPTY_CONTENT,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    });
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to load note');
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, [sceneId, projectId, sceneNoteRepository]);

    // Save function
    const saveNote = useCallback(async () => {
        if (!note || !sceneId) return;

        const contentToSave = pendingContentRef.current ?? note.content;
        pendingContentRef.current = null;

        setIsSaving(true);
        setError(null);

        try {
            const saved = await sceneNoteRepository.save({
                ...note,
                content: contentToSave,
            });
            setNote(saved);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save note');
        } finally {
            setIsSaving(false);
        }
    }, [note, sceneId, sceneNoteRepository]);

    // Update content with debounced auto-save
    const updateContent = useCallback((content: TiptapContent) => {
        if (!note) return;

        pendingContentRef.current = content;
        setNote(prev => prev ? { ...prev, content } : null);

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new debounced save
        saveTimeoutRef.current = setTimeout(() => {
            saveNote();
        }, autoSaveDelay);
    }, [note, saveNote, autoSaveDelay]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Delete note
    const deleteNote = useCallback(async () => {
        if (!sceneId) return;

        setIsSaving(true);
        try {
            await sceneNoteRepository.delete(sceneId);
            setNote({
                id: crypto.randomUUID(),
                sceneId,
                projectId,
                content: EMPTY_CONTENT,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete note');
        } finally {
            setIsSaving(false);
        }
    }, [sceneId, projectId, sceneNoteRepository]);

    return {
        note,
        isLoading,
        isSaving,
        error,
        updateContent,
        saveNote,
        deleteNote,
    };
}
