"use client";

import { useState } from "react";
import { AIConnection } from "@/lib/config/ai-vendors";
import { modelDiscoveryService } from "@/infrastructure/services/ModelDiscoveryService";
import { AI_VENDORS } from "@/lib/config/ai-vendors";
import { logger } from "@/shared/utils/logger";

const log = logger.scope("useConnectionValidation");

/**
 * Hook for validating AI connections and fetching models.
 * Uses ModelDiscoveryService for dynamic model fetching from provider APIs.
 */
export function useConnectionValidation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshModels = async (
    connection: AIConnection,
    apiKey: string,
    customEndpoint?: string,
  ): Promise<string[]> => {
    const vendor = AI_VENDORS[connection.provider];
    const normalizedApiKey = apiKey.trim();
    const endpoint = customEndpoint?.trim() || vendor.defaultEndpoint;

    if (vendor.requiresAuth && !normalizedApiKey) {
      setError("Please enter an API key first");
      throw new Error("API key is required");
    }

    setLoading(true);
    setError("");

    try {
      log.info(`Fetching models for ${connection.provider}...`);

      // Use ModelDiscoveryService for dynamic model fetching
      const result = await modelDiscoveryService.fetchModels(
        connection.provider,
        normalizedApiKey,
        endpoint,
      );

      if (result.error) {
        setError(result.error);
        setLoading(false);
        throw new Error(result.error);
      }

      // Extract model IDs
      const modelIds = result.models.map((m) => m.id);
      log.info(`Found ${modelIds.length} models for ${connection.provider}`);

      setLoading(false);
      return modelIds;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch models";
      setError(errorMessage);
      setLoading(false);
      log.error("Failed to fetch models:", err);
      throw err;
    }
  };

  return {
    loading,
    error,
    refreshModels,
  };
}
