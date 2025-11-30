import { useRepository } from './use-repository';
import type { IExportService } from '@/domain/services/IExportService';

/**
 * Hook to access the Export Service
 * Uses generic repository factory to eliminate code duplication
 */
export function useExportService(): IExportService {
    return useRepository<IExportService>('exportService');
}
