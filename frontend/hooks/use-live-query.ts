"use client";
/**
 * useLiveQuery Compatibility Shim
 *
 * This provides a drop-in replacement for the removed dexie-react-hooks useLiveQuery.
 * It uses useState/useEffect to fetch data asynchronously.
 *
 * Usage: Replace `from '@/hooks/use-live-query'` with `from '@/hooks/use-live-query'`
 */

import { useState, useEffect, useRef } from "react";
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

/**
 * Trigger all useLiveQuery hooks to refetch their data
 * Call this after any mutation (create, update, delete).
 * Pass keys to invalidate only related queries.
 */
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
  /**
   * Optional invalidation key(s). When provided, invalidateQueries(key)
   * only refreshes queries sharing that key.
   */
  keys?: string | string[];
}

/**
 * A hook that executes an async query function and returns the result.
 * Provides compatibility with the dexie-react-hooks useLiveQuery API.
 *
 * @param queryFn - Async function that returns the data
 * @param deps - Dependency array (like useEffect)
 * @returns The query result, or undefined if loading
 */
export function useLiveQuery<T>(
  queryFn: () => T | Promise<T>,
  deps: React.DependencyList = [],
  options: UseLiveQueryOptions = {},
): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);
  const keysRef = useRef<Set<string>>(normalizeKeys(options.keys));

  useEffect(() => {
    keysRef.current = normalizeKeys(options.keys);
  }, [options.keys]);

  // Register for global refresh notifications
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
    mountedRef.current = true;

    const executeQuery = async () => {
      try {
        const data = await queryFn();
        if (mountedRef.current) {
          setResult(data);
          setError(undefined);
        }
      } catch (err) {
        if (mountedRef.current) {
          log.error("Query execution failed", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setResult(undefined);
        }
      }
    };

    executeQuery();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  if (error) {
    log.warn("Query encountered an error", { message: error.message });
  }

  return result;
}
