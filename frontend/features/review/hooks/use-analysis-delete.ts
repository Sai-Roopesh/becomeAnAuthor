'use client';

import { useCallback } from 'react';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { toast } from '@/shared/utils/toast-service';

export function useAnalysisDelete() {
    const { analysisRepository } = useAppServices();

    const deleteAnalysis = useCallback(
        async (analysisId: string) => {
            try {
                await analysisRepository.delete(analysisId);
                toast.success('Analysis deleted successfully');
            } catch (error) {
                console.error('Failed to delete analysis:', error);
                toast.error('Failed to delete analysis');
                throw error;
            }
        },
        [analysisRepository]
    );

    return { deleteAnalysis };
}
