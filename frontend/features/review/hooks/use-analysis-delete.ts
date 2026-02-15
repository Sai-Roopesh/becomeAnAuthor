"use client";

import { useCallback } from "react";
import { useAppServices } from "@/infrastructure/di/AppContext";
import { toast } from "@/shared/utils/toast-service";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("useAnalysisDelete");

export function useAnalysisDelete() {
  const { analysisRepository } = useAppServices();

  const deleteAnalysis = useCallback(
    async (analysisId: string) => {
      try {
        await analysisRepository.delete(analysisId);
        toast.success("Analysis deleted successfully");
      } catch (error) {
        log.error("Failed to delete analysis:", error);
        toast.error("Failed to delete analysis");
        throw error;
      }
    },
    [analysisRepository],
  );

  return { deleteAnalysis };
}
