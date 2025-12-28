"use client";
/**
 * useLiveQuery Compatibility Shim
 * 
 * This provides a drop-in replacement for the removed dexie-react-hooks useLiveQuery.
 * It uses useState/useEffect to fetch data asynchronously.
 * 
 * Usage: Replace `from '@/hooks/use-live-query'` with `from '@/hooks/use-live-query'`
 */

import { useState, useEffect, useRef } from 'react';

// Global refresh counter - incrementing this triggers all useLiveQuery hooks to refetch
// globalRefreshCounter removed - unused
const listeners = new Set<() => void>();

/**
 * Trigger all useLiveQuery hooks to refetch their data
 * Call this after any mutation (create, update, delete)
 */
export function invalidateQueries(): void {
    // Global refresh trigger
    listeners.forEach(listener => listener());
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
    deps: React.DependencyList = []
): T | undefined {
    const [result, setResult] = useState<T | undefined>(undefined);
    const [error, setError] = useState<Error | undefined>(undefined);
    const [refreshKey, setRefreshKey] = useState(0);
    const mountedRef = useRef(true);

    // Register for global refresh notifications
    useEffect(() => {
        const listener = () => setRefreshKey(k => k + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
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
                    console.error('useLiveQuery error:', err);
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
        console.warn('useLiveQuery encountered an error:', error.message);
    }

    return result;
}

export default useLiveQuery;
