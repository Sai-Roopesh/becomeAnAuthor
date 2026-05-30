"use client";

import { useEffect, useState } from "react";
import { getFeatureFlags } from "@/core/state/app-state";

// Module-level cache to avoid re-fetching on every render
const flagCache = new Map<string, boolean>();
let cachePopulated = false;
let inflightPromise: Promise<void> | null = null;

async function populateCache(): Promise<void> {
  if (cachePopulated) return;
  if (inflightPromise) return inflightPromise;

  inflightPromise = getFeatureFlags()
    .then((flags) => {
      Object.entries(flags).forEach(([key, val]) => {
        flagCache.set(key, val);
      });
      cachePopulated = true;
      inflightPromise = null;
    })
    .catch(() => {
      // On error leave cache empty; individual hooks return false
      inflightPromise = null;
    });

  return inflightPromise;
}

// Returns whether a named feature flag is enabled.
// Flags are stored in app_preferences under key 'FEATURE_FLAGS' as JSON object.
// Usage: const isEnabled = useFeatureFlag('COLLABORATION_P2P')
export function useFeatureFlag(name: string): boolean {
  const [enabled, setEnabled] = useState<boolean>(
    () => flagCache.get(name) ?? false,
  );

  useEffect(() => {
    if (cachePopulated) {
      setEnabled(flagCache.get(name) ?? false);
      return;
    }

    void populateCache().then(() => {
      setEnabled(flagCache.get(name) ?? false);
    });
  }, [name]);

  return enabled;
}
