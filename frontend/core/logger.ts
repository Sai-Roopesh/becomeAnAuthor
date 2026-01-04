/**
 * Structured Logger
 * Provides consistent logging with persistence and export capabilities
 */

import { storage } from '@/core/storage/safe-storage';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Type for log metadata - allows any serializable value */
type LogMetadata = Record<string, unknown>;

export interface LogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    message: string;
    metadata?: LogMetadata;
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
    debug(message: string, metadata?: LogMetadata) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, metadata);
            console.debug(`[DEBUG] ${message}`, metadata);
        }
    }

    /**
     * Log an info message
     */
    info(message: string, metadata?: LogMetadata) {
        this.log('info', message, metadata);
        console.info(`[INFO] ${message}`, metadata);
    }

    /**
     * Log a warning
     */
    warn(message: string, metadata?: LogMetadata) {
        this.log('warn', message, metadata);
        console.warn(`[WARN] ${message}`, metadata);
    }

    /**
     * Log an error
     */
    error(message: string, metadata?: LogMetadata) {
        this.log('error', message, metadata);
        console.error(`[ERROR] ${message}`, metadata);

        // Persist errors immediately
        this.saveLogs();
    }

    /**
     * Internal logging method
     */
    private log(level: LogLevel, message: string, metadata?: LogMetadata) {
        const entry: LogEntry = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            timestamp: Date.now(),
            level,
            message,
            ...(metadata !== undefined && { metadata }),
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
            this.saveLogs();
        }
    }

    /**
     * Load logs from localStorage
     */
    private loadLogs() {
        this.logs = storage.getItem<LogEntry[]>(this.STORAGE_KEY, []);
    }

    /**
     * Persist logs to localStorage
     */
    private saveLogs() {
        storage.setItem(this.STORAGE_KEY, this.logs);
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
        storage.removeItem(this.STORAGE_KEY);
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

    /**
     * Create a scoped logger for a specific component/feature
     * Automatically prefixes all log messages
     */
    scope(componentName: string) {
        return {
            debug: (msg: string, ctx?: LogMetadata) =>
                this.debug(`[${componentName}] ${msg}`, ctx),
            info: (msg: string, ctx?: LogMetadata) =>
                this.info(`[${componentName}] ${msg}`, ctx),
            warn: (msg: string, ctx?: LogMetadata) =>
                this.warn(`[${componentName}] ${msg}`, ctx),
            error: (msg: string, ctx?: LogMetadata) =>
                this.error(`[${componentName}] ${msg}`, ctx),
        };
    }
}

// Singleton instance
export const logger = new Logger();
