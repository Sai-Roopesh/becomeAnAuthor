import { useState } from 'react';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { toast } from '@/lib/toast-service';

export function useAnalysisRunner() {
    const { analysisService } = useAppServices();
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);

    const runAnalysis = async (
        projectId: string,
        scope: string[],
        types: string[],
        model: string
    ) => {
        setIsRunning(true);
        setProgress(0);

        try {
            const results = await analysisService.runAnalysis(projectId, scope, types, model);

            toast.success(`Analysis complete! ${results.length} analyses created.`);
            return results;
        } catch (error) {
            toast.error('Analysis failed: ' + (error as Error).message);
            throw error;
        } finally {
            setIsRunning(false);
            setProgress(0);
        }
    };

    const estimateTokens = async (scope: string[], types: string[]) => {
        return await analysisService.estimateTokens(scope, types);
    };

    return {
        runAnalysis,
        estimateTokens,
        isRunning,
        progress,
    };
}
