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

  it("should return loading: true and data: undefined initially", () => {
    const mockQueryFn = vi.fn().mockResolvedValue([{ id: 1 }]);

    const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

    // Initially loading before async resolves
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it("should return data after query resolves", async () => {
    const mockData = [{ id: "1", name: "Test" }];
    const mockQueryFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

    await waitFor(() => {
      const { data: result_ } = result.current;
      expect(result_).toEqual(mockData);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should call query function with dependencies", async () => {
    const mockQueryFn = vi.fn().mockResolvedValue([]);

    renderHook(() => useLiveQuery(mockQueryFn, ["dep1", "dep2"]));

    await waitFor(() => {
      expect(mockQueryFn).toHaveBeenCalled();
    });
  });

  it("should handle async query functions", async () => {
    const asyncData = { async: true };
    const mockQueryFn = vi.fn().mockResolvedValue(asyncData);

    const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

    await waitFor(() => {
      expect(result.current.data).toEqual(asyncData);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
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
      expect(result.current.data).toEqual([{ id: "1" }]);
    });

    // Change dependency
    rerender({ dep: "second" });

    await waitFor(() => {
      expect(mockQueryFn).toHaveBeenCalledTimes(2);
    });
  });

  it("should set loading: true again on re-query (dep change)", async () => {
    const deferred = createDeferred<string>();
    const mockQueryFn = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockReturnValueOnce(deferred.promise);

    const { result, rerender } = renderHook(
      ({ dep }) => useLiveQuery(mockQueryFn, [dep]),
      { initialProps: { dep: "a" } },
    );

    await waitFor(() => {
      expect(result.current.data).toBe("first");
      expect(result.current.loading).toBe(false);
    });

    rerender({ dep: "b" });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    deferred.resolve("second");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe("second");
    });
  });

  it("should set error and loading: false after a failed query", async () => {
    const testError = new Error("query failed");
    const mockQueryFn = vi.fn().mockRejectedValue(testError);

    const { result } = renderHook(() => useLiveQuery(mockQueryFn, []));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("query failed");
    expect(result.current.data).toBeUndefined();
  });

  it("should reset error to null on re-query after failure", async () => {
    const testError = new Error("transient failure");
    const mockQueryFn = vi
      .fn()
      .mockRejectedValueOnce(testError)
      .mockResolvedValueOnce("recovered");

    const { result, rerender } = renderHook(
      ({ dep }) => useLiveQuery(mockQueryFn, [dep]),
      { initialProps: { dep: "a" } },
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    rerender({ dep: "b" });

    // During re-query: loading resets, error resets
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe("recovered");
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

    const { result } = renderHook(() => useLiveQuery(mockQueryFn, [], "race"));

    invalidateQueries("race");

    second.resolve("newer");
    await waitFor(() => {
      expect(result.current.data).toBe("newer");
    });

    first.resolve("stale");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current.data).toBe("newer");
    expect(mockQueryFn).toHaveBeenCalledTimes(2);
  });

  it("should set loading: true again on invalidation", async () => {
    const deferred = createDeferred<string>();
    const mockQueryFn = vi
      .fn()
      .mockResolvedValueOnce("initial")
      .mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() =>
      useLiveQuery(mockQueryFn, [], "invalidation-test"),
    );

    await waitFor(() => {
      expect(result.current.data).toBe("initial");
      expect(result.current.loading).toBe(false);
    });

    invalidateQueries("invalidation-test");

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    deferred.resolve("refreshed");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe("refreshed");
    });
  });
});
