/**
 * Production-safe logging utility
 * Debug logs are disabled in production builds
 * 
 * @example
 * // Global usage
 * import { logger } from '@/shared/utils/logger';
 * logger.debug('Fetching project', { projectId });
 * 
 * // Scoped usage (recommended for features)
 * const log = logger.scope('EditorFeature');
 * log.debug('Scene switched', { sceneId });
 */

// LogLevel removed - unused

// Note: LogContext uses 'any' intentionally - log metadata is inherently dynamic
interface LogContext {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development';

    debug(message: string, context?: LogContext): void {
        if (this.isDevelopment) {
            console.log('[DEBUG]', message, context || '');
        }
    }

    info(message: string, context?: LogContext): void {
        console.info('[INFO]', message, context || '');
    }

    warn(message: string, context?: LogContext): void {
        console.warn('[WARN]', message, context || '');
    }

    error(message: string, error?: Error | unknown, context?: LogContext): void {
        console.error('[ERROR]', message, error, context || '');
    }

    /**
     * Create a scoped logger for a specific component/feature
     * Automatically prefixes all log messages
     */
    scope(componentName: string) {
        return {
            debug: (msg: string, ctx?: LogContext) =>
                this.debug(`[${componentName}] ${msg}`, ctx),
            info: (msg: string, ctx?: LogContext) =>
                this.info(`[${componentName}] ${msg}`, ctx),
            warn: (msg: string, ctx?: LogContext) =>
                this.warn(`[${componentName}] ${msg}`, ctx),
            error: (msg: string, err?: Error | unknown, ctx?: LogContext) =>
                this.error(`[${componentName}] ${msg}`, err, ctx),
        };
    }
}

export const logger = new Logger();
