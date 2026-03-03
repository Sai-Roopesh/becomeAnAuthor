"use client";

import { useEffect, useRef, useState, type DependencyList } from "react";
import { logger } from "@/shared/utils/logger";

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

interface UseLiveQueryOptions {
  keys?: string | string[];
}

export function useLiveQuery<T>(
  queryFn: () => T | Promise<T>,
  deps: DependencyList = [],
  options: UseLiveQueryOptions = {},
): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const keysRef = useRef<Set<string>>(normalizeKeys(options.keys));
  const requestVersionRef = useRef(0);

  useEffect(() => {
    keysRef.current = normalizeKeys(options.keys);
  }, [options.keys]);

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

    void Promise.resolve(queryFn())
      .then((data) => {
        if (active && requestVersionRef.current === requestVersion) {
          setResult(data);
        }
      })
      .catch((err) => {
        if (active && requestVersionRef.current === requestVersion) {
          log.error("Query execution failed", err);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  return result;
}
