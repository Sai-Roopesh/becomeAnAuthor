"use client";

import { useEffect, useState } from "react";
import { hasUsableAIConnection } from "@/lib/ai";
import { AI_CONNECTIONS_UPDATED_EVENT } from "@/core/state/app-state";

import { logger } from "@/shared/utils/logger";

const log = logger.scope("useHasAIConnection");

export function useHasAIConnection() {
  const [hasAIConnection, setHasAIConnection] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const usable = await hasUsableAIConnection();
        if (!cancelled) {
          setHasAIConnection(usable);
        }
      } catch (err) {
        log.error("Failed to check for usable AI connection:", err);
        if (!cancelled) {
          setHasAIConnection(false);
        }
      }
    };
    const handleRefresh = () => {
      void refresh();
    };

    void refresh();
    window.addEventListener(AI_CONNECTIONS_UPDATED_EVENT, handleRefresh);
    window.addEventListener("focus", handleRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener(AI_CONNECTIONS_UPDATED_EVENT, handleRefresh);
      window.removeEventListener("focus", handleRefresh);
    };
  }, []);

  return hasAIConnection;
}
