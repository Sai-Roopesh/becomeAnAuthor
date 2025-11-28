'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
    return (
        <Toaster
            richColors
            position="bottom-right"
            expand={true}
            closeButton={true}
        />
    );
}
