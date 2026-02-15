"use client";
import { useState } from "react";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { toast } from "@/shared/utils/toast-service";

export function useAnalysisRunner() {
  const { analysisService } = useAppServices();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("Idle");

  const runAnalysis = async (
    projectId: string,
    scope: string[],
    types: string[],
    model: string,
  ) => {
    setIsRunning(true);
    setProgress(0);
    setPhase("Preparing manuscript");
    let progressTimer: ReturnType<typeof setInterval> | null = null;

    try {
      setProgress(12);
      setPhase("Running selected analyses");
      progressTimer = setInterval(() => {
        setProgress((current) => Math.min(current + 4, 88));
      }, 1000);

      const results = await analysisService.runAnalysis(
        projectId,
        scope,
        types,
        model,
      );
      setPhase("Saving analysis results");
      setProgress(96);

      toast.success(`Analysis complete! ${results.length} analyses created.`);
      setProgress(100);
      setPhase("Completed");
      return results;
    } catch (error) {
      toast.error("Analysis failed: " + (error as Error).message);
      setPhase("Failed");
      throw error;
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setIsRunning(false);
      setTimeout(() => {
        setProgress(0);
        setPhase("Idle");
      }, 600);
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
    phase,
  };
}
