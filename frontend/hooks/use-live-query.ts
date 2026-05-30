"use client";

import { useEffect, useRef, useState, type DependencyList } from "react";
import { logger } from "@/shared/utils/logger";
import { TauriNotAvailableError } from "@/core/tauri/invoke";

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
          if (!(err instanceof TauriNotAvailableError)) {
            log.error("Query execution failed", err);
          }
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  return { data, loading, error };
}
