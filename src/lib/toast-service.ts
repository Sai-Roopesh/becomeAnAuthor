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

export const toast = {
    success: (message: string, options?: ToastOptions) => {
        return sonnerToast.success(message, options);
    },

    error: (message: string, options?: ToastOptions) => {
        return sonnerToast.error(message, options);
    },

    warning: (message: string, options?: ToastOptions) => {
        return sonnerToast.warning(message, options);
    },

    info: (message: string, options?: ToastOptions) => {
        return sonnerToast.info(message, options);
    },

    loading: (message: string) => {
        return sonnerToast.loading(message);
    },

    dismiss: (toastId?: string | number) => {
        sonnerToast.dismiss(toastId);
    },
};
