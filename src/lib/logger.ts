/**
 * Structured Logger
 * Provides consistent logging with persistence and export capabilities
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    message: string;
    metadata?: Record<string, any>;
    url: string;
    userAgent: string;
}

class Logger {
    private logs: LogEntry[] = [];
    private readonly MAX_LOGS = 1000;
    private readonly STORAGE_KEY = 'app_logs';

    constructor() {
        // Load existing logs from localStorage
        this.loadLogs();
    }

    /**
     * Log a debug message (development only)
     */
    debug(message: string, metadata?: Record<string, any>) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, metadata);
            console.debug(`[DEBUG] ${message}`, metadata);
        }
    }

    /**
     * Log an info message
     */
    info(message: string, metadata?: Record<string, any>) {
        this.log('info', message, metadata);
        console.info(`[INFO] ${message}`, metadata);
    }

    /**
     * Log a warning
     */
    warn(message: string, metadata?: Record<string, any>) {
        this.log('warn', message, metadata);
        console.warn(`[WARN] ${message}`, metadata);
    }

    /**
     * Log an error
     */
    error(message: string, metadata?: Record<string, any>) {
        this.log('error', message, metadata);
        console.error(`[ERROR] ${message}`, metadata);

        // Persist errors immediately
        this.persistLogs();
    }

    /**
     * Internal logging method
     */
    private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
        const entry: LogEntry = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            level,
            message,
            metadata,
            url: typeof window !== 'undefined' ? window.location.href : '',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        };

        this.logs.push(entry);

        // Trim logs if too many
        if (this.logs.length > this.MAX_LOGS) {
            this.logs = this.logs.slice(-this.MAX_LOGS);
        }

        // Persist periodically (errors immediately, others batched)
        if (level === 'error' || this.logs.length % 10 === 0) {
            this.persistLogs();
        }
    }

    /**
     * Load logs from localStorage
     */
    private loadLogs() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.logs = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load logs:', error);
        }
    }

    /**
     * Persist logs to localStorage
     */
    private persistLogs() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
        } catch (error) {
            console.error('Failed to persist logs:', error);
        }
    }

    /**
     * Get all logs
     */
    getLogs(level?: LogLevel): LogEntry[] {
        if (level) {
            return this.logs.filter((log) => log.level === level);
        }
        return [...this.logs];
    }

    /**
     * Clear all logs
     */
    clear() {
        this.logs = [];
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }

    /**
     * Export logs as JSON
     */
    exportLogs(): string {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * Download logs as file
     */
    downloadLogs() {
        const data = this.exportLogs();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `app-logs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Singleton instance
export const logger = new Logger();
