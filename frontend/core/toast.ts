/**
 * Core Toast Service
 * Minimal toast interface for core layer - avoids importing from shared/
 */
import { toast as sonnerToast } from "sonner";

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
    sonnerToast.success(message, { duration: 4000, ...options }),

  error: (message: string, options?: ToastOptions) =>
    sonnerToast.error(message, { duration: 5000, ...options }),

  info: (message: string, options?: ToastOptions) =>
    sonnerToast.info(message, { duration: 4000, ...options }),

  warning: (message: string, options?: ToastOptions) =>
    sonnerToast.warning(message, { duration: 5000, ...options }),
};
