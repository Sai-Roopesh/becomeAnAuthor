"use client";

import { useEffect, useState } from "react";
import { getEnabledConnections } from "@/lib/ai";

export const AI_CONNECTIONS_UPDATED_EVENT = "ai-connections-updated";

export function useHasAIConnection() {
  const [hasAIConnection, setHasAIConnection] = useState(
    () => getEnabledConnections().length > 0,
  );

  useEffect(() => {
    const refresh = () => {
      setHasAIConnection(getEnabledConnections().length > 0);
    };

    refresh();
    window.addEventListener(AI_CONNECTIONS_UPDATED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(AI_CONNECTIONS_UPDATED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return hasAIConnection;
}
