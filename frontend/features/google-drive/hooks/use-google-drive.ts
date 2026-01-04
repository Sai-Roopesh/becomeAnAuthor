/**
 * React hook for Google Drive operations
 * Provides methods for backup/restore operations
 */

'use client';

import { useState, useCallback } from 'react';
import { googleDriveService } from '@/infrastructure/services/google-drive-service';
import { DriveFile, DriveQuota } from '@/domain/entities/types';
import { useGoogleAuth } from './use-google-auth';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('GoogleDrive');

export function useGoogleDrive() {
    const { isAuthenticated } = useGoogleAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const listBackups = useCallback(async (): Promise<DriveFile[]> => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        try {
            setError(null);
            return await googleDriveService.listBackups();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list backups';
            log.error('List backups failed:', err);
            setError(message);
            throw err;
        }
    }, [isAuthenticated]);

    const deleteBackup = useCallback(async (fileId: string): Promise<void> => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        try {
            setError(null);
            await googleDriveService.deleteBackup(fileId);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete backup';
            log.error('Delete backup failed:', err);
            setError(message);
            throw err;
        }
    }, [isAuthenticated]);

    const getQuota = useCallback(async (): Promise<DriveQuota> => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        try {
            setError(null);
            return await googleDriveService.getStorageQuota();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get quota';
            log.error('Get quota failed:', err);
            setError(message);
            throw err;
        }
    }, [isAuthenticated]);

    return {
        isUploading,
        isDownloading,
        error,
        setIsUploading,
        setIsDownloading,
        listBackups,
        deleteBackup,
        getQuota,
    };
}
