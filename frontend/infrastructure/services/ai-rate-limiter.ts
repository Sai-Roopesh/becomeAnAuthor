/**
 * AI Rate Limiter
 * 
 * Prevents excessive AI API calls to avoid runaway costs.
 * Implements token bucket algorithm with configurable limits.
 */

interface RateLimiterConfig {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    warningThreshold: number; // Percentage (0-1)
}

interface RateLimiterState {
    minuteRequests: number[];
    hourRequests: number[];
    isWarningShown: boolean;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
    maxRequestsPerMinute: 20,
    maxRequestsPerHour: 200,
    warningThreshold: 0.8, // Warn at 80% usage
};

class AIRateLimiter {
    private config: RateLimiterConfig;
    private state: RateLimiterState;
    private onWarning?: (usage: number, limit: number, period: string) => void;
    private onBlocked?: (retryAfterMs: number) => void;

    constructor(config: Partial<RateLimiterConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.state = {
            minuteRequests: [],
            hourRequests: [],
            isWarningShown: false,
        };
    }

    /**
     * Set callback for rate limit warnings
     */
    setWarningCallback(callback: (usage: number, limit: number, period: string) => void) {
        this.onWarning = callback;
    }

    /**
     * Set callback for when requests are blocked
     */
    setBlockedCallback(callback: (retryAfterMs: number) => void) {
        this.onBlocked = callback;
    }

    /**
     * Clean up old timestamps from the tracking arrays
     */
    private cleanupTimestamps() {
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        const oneHourAgo = now - 60 * 60 * 1000;

        this.state.minuteRequests = this.state.minuteRequests.filter(t => t > oneMinuteAgo);
        this.state.hourRequests = this.state.hourRequests.filter(t => t > oneHourAgo);
    }

    /**
     * Check if a request can be made
     */
    canMakeRequest(): { allowed: boolean; retryAfterMs?: number; reason?: string } {
        this.cleanupTimestamps();

        const minuteCount = this.state.minuteRequests.length;
        const hourCount = this.state.hourRequests.length;

        // Check minute limit
        if (minuteCount >= this.config.maxRequestsPerMinute) {
            const oldestMinuteRequest = Math.min(...this.state.minuteRequests);
            const retryAfter = oldestMinuteRequest + 60000 - Date.now();

            this.onBlocked?.(retryAfter);

            return {
                allowed: false,
                retryAfterMs: retryAfter,
                reason: `Rate limit exceeded: ${minuteCount}/${this.config.maxRequestsPerMinute} requests per minute`
            };
        }

        // Check hour limit
        if (hourCount >= this.config.maxRequestsPerHour) {
            const oldestHourRequest = Math.min(...this.state.hourRequests);
            const retryAfter = oldestHourRequest + 3600000 - Date.now();

            this.onBlocked?.(retryAfter);

            return {
                allowed: false,
                retryAfterMs: retryAfter,
                reason: `Rate limit exceeded: ${hourCount}/${this.config.maxRequestsPerHour} requests per hour`
            };
        }

        // Check warning threshold
        const minuteUsage = minuteCount / this.config.maxRequestsPerMinute;
        const hourUsage = hourCount / this.config.maxRequestsPerHour;

        if (minuteUsage >= this.config.warningThreshold && !this.state.isWarningShown) {
            this.state.isWarningShown = true;
            this.onWarning?.(minuteCount, this.config.maxRequestsPerMinute, 'minute');

            // Reset warning flag after 30 seconds
            setTimeout(() => { this.state.isWarningShown = false; }, 30000);
        }

        if (hourUsage >= this.config.warningThreshold && !this.state.isWarningShown) {
            this.state.isWarningShown = true;
            this.onWarning?.(hourCount, this.config.maxRequestsPerHour, 'hour');

            setTimeout(() => { this.state.isWarningShown = false; }, 30000);
        }

        return { allowed: true };
    }

    /**
     * Record a request
     */
    recordRequest() {
        const now = Date.now();
        this.state.minuteRequests.push(now);
        this.state.hourRequests.push(now);
    }

    /**
     * Get current usage stats
     */
    getUsageStats() {
        this.cleanupTimestamps();

        return {
            minuteRequests: this.state.minuteRequests.length,
            minuteLimit: this.config.maxRequestsPerMinute,
            hourRequests: this.state.hourRequests.length,
            hourLimit: this.config.maxRequestsPerHour,
            minuteUsagePercent: (this.state.minuteRequests.length / this.config.maxRequestsPerMinute) * 100,
            hourUsagePercent: (this.state.hourRequests.length / this.config.maxRequestsPerHour) * 100,
        };
    }

    /**
     * Reset all counters
     */
    reset() {
        this.state.minuteRequests = [];
        this.state.hourRequests = [];
        this.state.isWarningShown = false;
    }
}

// Export singleton instance
export const aiRateLimiter = new AIRateLimiter();

// Export factory for custom configuration
export function createRateLimiter(config?: Partial<RateLimiterConfig>) {
    return new AIRateLimiter(config);
}

export type { RateLimiterConfig, RateLimiterState };
