/**
 * Toast notification service
 * Wrapper around sonner for consistent notifications across the app
 */

import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  description?: string;
  duration?: number;
  id?: string | number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const toastService = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      ...(options?.id !== undefined ? { id: options.id } : {}),
      ...(options?.description !== undefined
        ? { description: options.description }
        : {}),
      duration: options?.duration ?? 4000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      ...(options?.id !== undefined ? { id: options.id } : {}),
      ...(options?.description !== undefined
        ? { description: options.description }
        : {}),
      duration: options?.duration ?? 5000,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      ...(options?.id !== undefined ? { id: options.id } : {}),
      ...(options?.description !== undefined
        ? { description: options.description }
        : {}),
      duration: options?.duration ?? 4000,
    });
  },

  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      ...(options?.id !== undefined ? { id: options.id } : {}),
      ...(options?.description !== undefined
        ? { description: options.description }
        : {}),
      duration: options?.duration ?? 4000,
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return sonnerToast.loading(message, {
      ...(options?.id !== undefined ? { id: options.id } : {}),
      ...(options?.description !== undefined
        ? { description: options.description }
        : {}),
      ...(options?.duration !== undefined
        ? { duration: options.duration }
        : {}),
    });
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};

export { toastService as toast };
