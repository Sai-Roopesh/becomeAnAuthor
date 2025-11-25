import { useAppServices } from '@/infrastructure/di/AppContext';
import type { IExportService } from '@/domain/services/IExportService';

/**
 * Hook to access the Export Service
 * Uses centralized DI container for singleton instance
 */
export function useExportService(): IExportService {
    return useAppServices().exportService;
}
