/**
 * Hook for opening projects from file picker or recent list
 * 
 * Follows pragmatic architecture - direct invoke from hook (per CODING_GUIDELINES)
 */

import { useState, useCallback } from 'react';
import {
    openProject,
    showOpenProjectDialog,
    type ProjectMeta
} from '@/core/tauri';
import { TauriNodeRepository } from '@/infrastructure/repositories/TauriNodeRepository';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('useOpenProject');

export interface UseOpenProjectResult {
    /** Open project via file picker dialog */
    openFromPicker: () => Promise<ProjectMeta | null>;
    /** Open project by known path (from recent list) */
    openByPath: (path: string) => Promise<ProjectMeta | null>;
    /** Whether a project is currently being opened */
    isOpening: boolean;
    /** Error message if opening failed */
    error: string | null;
    /** Clear the current error */
    clearError: () => void;
}

/**
 * Hook for opening projects
 * 
 * @example
 * ```tsx
 * const { openFromPicker, openByPath, isOpening, error } = useOpenProject();
 * 
 * // From "Open Novel..." button
 * const handleOpenClick = async () => {
 *     const project = await openFromPicker();
 *     if (project) {
 *         router.push(`/editor/${project.id}`);
 *     }
 * };
 * 
 * // From recent projects list
 * const handleRecentClick = async (path: string) => {
 *     const project = await openByPath(path);
 *     if (project) {
 *         router.push(`/editor/${project.id}`);
 *     }
 * };
 * ```
 */
export function useOpenProject(): UseOpenProjectResult {
    const [isOpening, setIsOpening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openFromPicker = useCallback(async (): Promise<ProjectMeta | null> => {
        setIsOpening(true);
        setError(null);

        try {
            // Show file picker
            const selectedPath = await showOpenProjectDialog();

            if (!selectedPath) {
                // User cancelled
                return null;
            }

            // Open and validate the project
            const project = await openProject(selectedPath);

            // Set project path for other repositories
            TauriNodeRepository.getInstance().setProjectPath(selectedPath);

            log.info('Opened project from picker', { path: selectedPath, title: project.title });
            return project;

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to open project';
            setError(message);
            log.error('Failed to open project from picker', err);
            return null;
        } finally {
            setIsOpening(false);
        }
    }, []);

    const openByPath = useCallback(async (path: string): Promise<ProjectMeta | null> => {
        setIsOpening(true);
        setError(null);

        try {
            // Open and validate the project
            const project = await openProject(path);

            // Set project path for other repositories
            TauriNodeRepository.getInstance().setProjectPath(path);

            log.info('Opened project by path', { path, title: project.title });
            return project;

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to open project';
            setError(message);
            log.error('Failed to open project by path', { path, error: err });
            return null;
        } finally {
            setIsOpening(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        openFromPicker,
        openByPath,
        isOpening,
        error,
        clearError,
    };
}
