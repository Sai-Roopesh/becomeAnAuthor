import { useState, useCallback } from "react";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("useExportPreview");
import type {
  ExportPreset,
  ExportConfig,
  PreviewPage,
} from "@/domain/types/export-types";
import { useAppServices } from "@/infrastructure/di/AppContext";

/**
 * Hook for managing export preview state
 * Handles preview generation and navigation
 */
export function useExportPreview(projectId: string) {
  const { exportService } = useAppServices();
  const [preview, setPreview] = useState<PreviewPage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate preview for a preset with optional custom config
   */
  const generatePreview = useCallback(
    async (preset: ExportPreset, customConfig?: Partial<ExportConfig>) => {
      setIsGenerating(true);
      setError(null);
      try {
        const pages = await exportService.generatePreview(
          projectId,
          preset,
          customConfig,
        );
        setPreview(pages);
        setCurrentPage(0); // Reset to first page
      } catch (err) {
        log.error("Preview generation failed:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate preview",
        );
        setPreview([]);
      } finally {
        setIsGenerating(false);
      }
    },
    [projectId, exportService],
  );

  /**
   * Navigate to next page
   */
  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, preview.length - 1));
  }, [preview.length]);

  /**
   * Navigate to previous page
   */
  const previousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  }, []);

  /**
   * Go to specific page
   */
  const goToPage = useCallback(
    (pageNumber: number) => {
      if (pageNumber >= 0 && pageNumber < preview.length) {
        setCurrentPage(pageNumber);
      }
    },
    [preview.length],
  );

  /**
   * Clear preview
   */
  const clearPreview = useCallback(() => {
    setPreview([]);
    setCurrentPage(0);
    setError(null);
  }, []);

  return {
    preview,
    currentPage,
    isGenerating,
    error,
    totalPages: preview.length,
    hasPreview: preview.length > 0,
    canGoNext: currentPage < preview.length - 1,
    canGoPrevious: currentPage > 0,
    generatePreview,
    nextPage,
    previousPage,
    goToPage,
    clearPreview,
  };
}
