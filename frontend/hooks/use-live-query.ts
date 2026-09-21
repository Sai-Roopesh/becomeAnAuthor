"use client";

import { useEffect, useRef, useState, type DependencyList } from "react";
import { logger } from "@/shared/utils/logger";
import { TauriNotAvailableError } from "@/core/tauri/invoke";
import { AppError } from "@/shared/errors/app-error";

// Error codes that signal a precondition not yet met — not a real error.
// Treat these as "data not available" rather than logging them as errors.
const PRECONDITION_CODES = new Set(["E_PROJECT_NOT_OPEN"]);

const log = logger.scope("useLiveQuery");

type ListenerEntry = {
  notify: () => void;
  getKeys: () => Set<string>;
};

const listeners = new Map<number, ListenerEntry>();
let listenerIdCounter = 0;

function normalizeKeys(keys?: string | string[]): Set<string> {
  if (!keys) return new Set();
  if (Array.isArray(keys)) {
    return new Set(keys.filter(Boolean));
  }
  return keys ? new Set([keys]) : new Set();
}

export function invalidateQueries(keys?: string | string[]): void {
  const scopedKeys = normalizeKeys(keys);
  const hasScope = scopedKeys.size > 0;

  listeners.forEach((entry) => {
    const listenerKeys = entry.getKeys();
    if (!hasScope || listenerKeys.size === 0) {
      entry.notify();
      return;
    }

    const matches = Array.from(scopedKeys).some((key) => listenerKeys.has(key));
    if (matches) {
      entry.notify();
    }
  });
}

export interface LiveQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

export function useLiveQuery<T>(
  queryFn: () => Promise<T>,
  deps: DependencyList,
  queryKey?: string | string[],
): LiveQueryResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const keysRef = useRef<Set<string>>(normalizeKeys(queryKey));
  const requestVersionRef = useRef(0);

  useEffect(() => {
    keysRef.current = normalizeKeys(queryKey);
  }, [queryKey]);

  useEffect(() => {
    const listener = () => setRefreshKey((k) => k + 1);
    const id = listenerIdCounter++;
    listeners.set(id, {
      notify: listener,
      getKeys: () => keysRef.current,
    });

    return () => {
      listeners.delete(id);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    setLoading(true);
    setError(null);

    void Promise.resolve(queryFn())
      .then((result) => {
        if (active && requestVersionRef.current === requestVersion) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active && requestVersionRef.current === requestVersion) {
          const isPrecondition =
            err instanceof AppError && PRECONDITION_CODES.has(err.code);
          const isTauriUnavailable = err instanceof TauriNotAvailableError;

          if (!isPrecondition && !isTauriUnavailable) {
            log.error("Query execution failed", err);
          }

          // Precondition errors (no project open) are not real errors —
          // return empty/undefined data silently so the UI shows its empty state.
          if (isPrecondition) {
            setData(undefined);
            setLoading(false);
          } else {
            setError(err instanceof Error ? err : new Error(String(err)));
            setLoading(false);
          }
        }
      });

    return () => {
      active = false;
    };

    // queryFn is intentionally excluded: callers must pass stable deps via the deps param.
    // Callers are responsible for listing all captured variables in their deps array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  return { data, loading, error };
}
