/**
 * Toast notification service
 * Wrapper around sonner for consistent notifications across the app
 */

import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
    description?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const toastService = {
    success: (message: string, options?: ToastOptions) => {
        return sonnerToast.success(message, {
            description: options?.description,
            duration: options?.duration || 4000,
            action: options?.action ? {
                label: options.action.label,
                onClick: options.action.onClick,
            } : undefined,
        });
    },

    error: (message: string, options?: ToastOptions) => {
        return sonnerToast.error(message, {
            description: options?.description,
            duration: options?.duration || 5000,
            action: options?.action ? {
                label: options.action.label,
                onClick: options.action.onClick,
            } : undefined,
        });
    },

    warning: (message: string, options?: ToastOptions) => {
        return sonnerToast.warning(message, {
            description: options?.description,
            duration: options?.duration || 4000,
        });
    },

    info: (message: string, options?: ToastOptions) => {
        return sonnerToast.info(message, {
            description: options?.description,
            duration: options?.duration || 4000,
        });
    },

    loading: (message: string) => {
        return sonnerToast.loading(message);
    },

    dismiss: (toastId?: string | number) => {
        sonnerToast.dismiss(toastId);
    },
};

export { toastService as toast };
