/**
 * Toast notification service
 * Wrapper around react-hot-toast for consistent notifications across the app
 */

import toast from 'react-hot-toast';

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
        return toast.success(message, {
            duration: options?.duration || 4000,
        });
    },

    error: (message: string, options?: ToastOptions) => {
        return toast.error(message, {
            duration: options?.duration || 5000,
        });
    },

    warning: (message: string, options?: ToastOptions) => {
        return toast(message, {
            icon: '⚠️',
            duration: options?.duration || 4000,
        });
    },

    info: (message: string, options?: ToastOptions) => {
        return toast(message, {
            icon: 'ℹ️',
            duration: options?.duration || 4000,
        });
    },

    loading: (message: string) => {
        return toast.loading(message);
    },

    dismiss: (toastId?: string) => {
        toast.dismiss(toastId);
    },
};

export { toastService as toast };
