"use client";
import { useEffect, useState } from 'react';
import { useAppServices } from '@/infrastructure/di/AppContext';
import type { StoryAnalysis } from '@/lib/config/types';

/**
 * Track how many scenes have been edited since analysis
 */
export function useManuscriptVersion(analysis: StoryAnalysis | undefined | null) {
    const { analysisService } = useAppServices();
    const [editedCount, setEditedCount] = useState(0);

    useEffect(() => {
        if (!analysis) {
            setEditedCount(0);
            return;
        }

        analysisService.countEditedScenes(analysis).then(setEditedCount);
    }, [analysis, analysisService]);

    return editedCount;
}
