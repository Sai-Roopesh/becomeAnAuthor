"use client";

import { useEffect, useState } from "react";
import { getEnabledConnections, hasUsableAIConnection } from "@/lib/ai";

export const AI_CONNECTIONS_UPDATED_EVENT = "ai-connections-updated";

export function useHasAIConnection() {
  const [hasAIConnection, setHasAIConnection] = useState(
    () => getEnabledConnections().length > 0,
  );

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const hasUsable = await hasUsableAIConnection();
      if (!cancelled) {
        setHasAIConnection(hasUsable);
      }
    };

    void refresh();
    const onRefresh = () => {
      void refresh();
    };
    window.addEventListener(AI_CONNECTIONS_UPDATED_EVENT, onRefresh);
    window.addEventListener("focus", onRefresh);
    window.addEventListener("storage", onRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener(AI_CONNECTIONS_UPDATED_EVENT, onRefresh);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("storage", onRefresh);
    };
  }, []);

  return hasAIConnection;
}
