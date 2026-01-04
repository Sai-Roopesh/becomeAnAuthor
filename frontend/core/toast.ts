/**
 * Core Toast Service
 * Minimal toast interface for core layer - avoids importing from shared/
 */
import { toast as sonnerToast } from 'sonner';

interface ToastAction {
    label: string;
    onClick: () => void;
}

interface ToastOptions {
    description?: string;
    action?: ToastAction;
}

export const toast = {
    success: (message: string, options?: ToastOptions) =>
        sonnerToast.success(message, options),

    error: (message: string, options?: ToastOptions) =>
        sonnerToast.error(message, options),

    info: (message: string, options?: ToastOptions) =>
        sonnerToast.info(message, options),

    warning: (message: string, options?: ToastOptions) =>
        sonnerToast.warning(message, options),
};
