import { useAppServices } from '@/infrastructure/di/AppContext';

/**
 * Hook to access the Series repository
 */
export function useSeriesRepository() {
    const { seriesRepository } = useAppServices();
    return seriesRepository;
}
