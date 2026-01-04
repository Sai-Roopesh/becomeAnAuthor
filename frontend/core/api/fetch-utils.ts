/**
 * Fetch utilities with timeout and error handling
 * Prevents UI freezes from hanging API requests
 */

interface FetchWithTimeoutOptions extends Omit<RequestInit, 'signal'> {
    signal?: AbortSignal;
}

export async function fetchWithTimeout(
    url: string,
    options: FetchWithTimeoutOptions = {},
    timeoutMs: number = 30000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // If external signal provided, abort when it aborts
    const externalSignal = options.signal;
    if (externalSignal) {
        externalSignal.addEventListener('abort', () => controller.abort());
    }

    // Build options with our controller's signal (excludes the original signal)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { signal: _, ...restOptions } = options;
    const fetchOptions: RequestInit = {
        ...restOptions,
        signal: controller.signal,
    };

    try {
        const response = await fetch(url, fetchOptions);
        return response;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            // Check if it was external cancellation or timeout
            if (externalSignal?.aborted) {
                throw new Error('Request cancelled');
            }
            throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
