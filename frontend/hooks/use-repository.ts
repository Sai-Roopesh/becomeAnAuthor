'use client';

import { useAppServices } from '@/infrastructure/di/AppContext';

/**
 * Generic repository hook factory
 * Eliminates duplication across 6 repository hooks
 * 
 * @example
 * ```typescript
 * const nodeRepo = useRepository<INodeRepository>('nodeRepository');
 * const chatRepo = useRepository<IChatRepository>('chatRepository');
 * ```
 */
export function useRepository<T>(key: keyof ReturnType<typeof useAppServices>): T {
    const services = useAppServices();
    return services[key] as T;
}
