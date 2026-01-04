"use client";
import { useCallback } from 'react';
import { toast } from '@/shared/utils/toast-service';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('ErrorHandler');

interface UseErrorHandlerOptions {
    showToast?: boolean;
    logToConsole?: boolean;
    onError?: (error: Error) => void;
}

/**
 * Standardized error handling hook
 * Provides consistent error handling across the application
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
    const { showToast = true, logToConsole = true, onError } = options;

    const handleError = useCallback(
        (error: Error | unknown, context?: string) => {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            const message = errorObj.message || 'An unexpected error occurred';

            // Always log errors via structured logger
            if (logToConsole) {
                log.error(`Error${context ? ` in ${context}` : ''}`, errorObj);
            }

            // Show toast notification
            if (showToast) {
                toast.error('Error', {
                    description: message,
                });
            }

            // Call custom error handler if provided
            onError?.(errorObj);

            return errorObj;
        },
        [showToast, logToConsole, onError]
    );

    return { handleError };
}
