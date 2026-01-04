'use client';

import { useRepository } from './use-repository';
import type { ISeriesRepository } from '@/domain/repositories/ISeriesRepository';

/**
 * Hook to access the Series repository
 * Uses generic repository factory to eliminate code duplication
 */
export function useSeriesRepository(): ISeriesRepository {
    return useRepository<ISeriesRepository>('seriesRepository');
}
