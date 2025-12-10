/**
 * Retry Utility
 * Implements exponential backoff with jitter for transient failures
 */

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
}

/**
 * Execute a function with retry logic
 * Implements exponential backoff with jitter
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        shouldRetry = defaultShouldRetry,
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Don't retry on last attempt or if error is not retryable
            if (attempt === maxRetries || !shouldRetry(lastError)) {
                throw lastError;
            }

            // Calculate delay with exponential backoff + jitter
            const exponentialDelay = initialDelay * Math.pow(2, attempt);
            const jitter = Math.random() * 1000; // Random 0-1000ms
            const delay = Math.min(exponentialDelay + jitter, maxDelay);

            console.log(
                `[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying after ${Math.round(delay)}ms...`,
                lastError.message
            );

            await sleep(delay);
        }
    }

    throw lastError!;
}

/**
 * Default retry logic - retries on transient errors
 */
function defaultShouldRetry(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retry on network/timeout errors
    if (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('failed to fetch') ||
        message.includes('networkerror')
    ) {
        return true;
    }

    // Retry on rate limits
    if (
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('too many requests')
    ) {
        return true;
    }

    // Retry on temporary server errors
    if (
        message.includes('500') ||
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504') ||
        message.includes('internal server error') ||
        message.includes('service unavailable')
    ) {
        return true;
    }

    // Don't retry on client errors (400, 401, 403, 404, etc.)
    return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
