/**
 * React hook for Google Drive operations
 * Provides methods for backup/restore operations
 */

'use client';

import { useState } from 'react';
import { googleDriveService } from '@/infrastructure/services/google-drive-service';
import { DriveFile, DriveQuota } from '@/lib/config/types';
import { useGoogleAuth } from './use-google-auth';

export function useGoogleDrive() {
    const { isAuthenticated } = useGoogleAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const listBackups = async (): Promise<DriveFile[]> => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        return await googleDriveService.listBackups();
    };

    const deleteBackup = async (fileId: string): Promise<void> => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        await googleDriveService.deleteBackup(fileId);
    };

    const getQuota = async (): Promise<DriveQuota> => {
        if (!isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        return await googleDriveService.getStorageQuota();
    };

    return {
        isUploading,
        isDownloading,
        listBackups,
        deleteBackup,
        getQuota,
    };
}
