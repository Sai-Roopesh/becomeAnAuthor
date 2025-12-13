import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { saveCoordinator } from '@/lib/core/save-coordinator';

/**
 * Hook for managing editor state including word count persistence.
 */
export function useEditorState(activeSceneId: string | null) {
    const [editorWordCount, setEditorWordCount] = useState(0);
    const { nodeRepository: nodeRepo } = useAppServices();

    const handleWordCountUpdate = (count: number) => {
        setEditorWordCount(count);
    };

    // Persist word count to database (debounced)
    const debouncedWordCount = useDebounce(editorWordCount, 2000);
    const prevSceneIdRef = useRef(activeSceneId);

    useEffect(() => {
        // Only update if we have an active scene and it's the same scene
        // Uses SaveCoordinator to prevent race conditions
        if (activeSceneId && activeSceneId === prevSceneIdRef.current && debouncedWordCount > 0) {
            saveCoordinator.scheduleSave(activeSceneId, async () => {
                await nodeRepo.updateMetadata(activeSceneId, { wordCount: debouncedWordCount });
            });
        }
        prevSceneIdRef.current = activeSceneId;
    }, [debouncedWordCount, activeSceneId, nodeRepo]);

    return {
        editorWordCount,
        handleWordCountUpdate,
    };
}
