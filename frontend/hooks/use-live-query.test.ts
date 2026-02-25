import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLiveQuery, invalidateQueries } from "./use-live-query";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useLiveQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return undefined initially", () => {
    const mockQueryFn = vi.fn().mockResolvedValue([{ id: 1 }]);

    const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

    // Initially undefined before async resolves
    expect(result.current).toBeUndefined();
  });

  it("should return data after query resolves", async () => {
    const mockData = [{ id: "1", name: "Test" }];
    const mockQueryFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

    await waitFor(() => {
      expect(result.current).toEqual(mockData);
    });
  });

  it("should call query function with dependencies", async () => {
    const mockQueryFn = vi.fn().mockResolvedValue([]);

    renderHook(() => useLiveQuery(mockQueryFn, ["dep1", "dep2"]));

    await waitFor(() => {
      expect(mockQueryFn).toHaveBeenCalled();
    });
  });

  it("should handle sync query functions", async () => {
    const syncData = { sync: true };
    const mockQueryFn = vi.fn().mockReturnValue(syncData);

    const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

    await waitFor(() => {
      expect(result.current).toEqual(syncData);
    });
  });

  it("should refetch when dependencies change", async () => {
    const mockQueryFn = vi
      .fn()
      .mockResolvedValueOnce([{ id: "1" }])
      .mockResolvedValueOnce([{ id: "2" }]);

    const { result, rerender } = renderHook(
      ({ dep }) => useLiveQuery(mockQueryFn, [dep]),
      { initialProps: { dep: "first" } },
    );

    await waitFor(() => {
      expect(result.current).toEqual([{ id: "1" }]);
    });

    // Change dependency
    rerender({ dep: "second" });

    await waitFor(() => {
      expect(mockQueryFn).toHaveBeenCalledTimes(2);
    });
  });

  it("should have invalidateQueries export", () => {
    expect(invalidateQueries).toBeDefined();
    expect(typeof invalidateQueries).toBe("function");
  });

  it("should ignore stale query results when a newer refresh resolves first", async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    const mockQueryFn = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result } = renderHook(() =>
      useLiveQuery(mockQueryFn, [], { keys: "race" }),
    );

    invalidateQueries("race");

    second.resolve("newer");
    await waitFor(() => {
      expect(result.current).toBe("newer");
    });

    first.resolve("stale");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current).toBe("newer");
    expect(mockQueryFn).toHaveBeenCalledTimes(2);
  });
});
