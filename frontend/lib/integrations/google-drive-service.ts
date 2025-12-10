/**
 * Google Drive API Service
 * Handles backup and restore operations to user's Google Drive
 */

import { googleAuthService } from './google-auth-service';
import { DriveFile, DriveQuota, DriveBackupMetadata, ExportedProject } from '@/lib/config/types';
import { fetchWithTimeout } from '@/core/api/fetch-utils';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER_NAME = 'BecomeAnAuthor';

class GoogleDriveService {
    /**
     * Ensure app folder exists in user's Drive, create if not
     */
    async ensureAppFolder(): Promise<string> {
        const accessToken = await googleAuthService.getAccessToken();
        if (!accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        // Search for existing folder
        const searchResponse = await fetchWithTimeout(
            `${DRIVE_API_BASE}/files?q=name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            },
            30000
        );

        if (!searchResponse.ok) {
            const errorData = await searchResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Drive API Error:', errorData);
            throw new Error(`Failed to search for app folder: ${errorData.error?.message || searchResponse.statusText}`);
        }

        const searchData = await searchResponse.json();

        // Return existing folder ID
        if (searchData.files && searchData.files.length > 0) {
            return searchData.files[0].id;
        }

        // Create new folder
        const createResponse = await fetchWithTimeout(
            `${DRIVE_API_BASE}/files`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: APP_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder',
                }),
            },
            30000
        );

        if (!createResponse.ok) {
            throw new Error('Failed to create app folder');
        }

        const createData = await createResponse.json();
        return createData.id;
    }

    /**
     * Upload backup to Google Drive
     */
    async uploadBackup(
        backupData: DriveBackupMetadata,
        fileName: string
    ): Promise<DriveFile> {
        const accessToken = await googleAuthService.getAccessToken();
        if (!accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        // Ensure app folder exists
        const folderId = await this.ensureAppFolder();

        // Prepare file metadata
        const metadata = {
            name: fileName,
            mimeType: 'application/json',
            parents: [folderId],
        };

        // Prepare file content
        const fileContent = JSON.stringify(backupData, null, 2);

        // Create multipart request body
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            fileContent +
            closeDelimiter;

        // Upload file
        const response = await fetchWithTimeout(
            `${UPLOAD_API_BASE}/files?uploadType=multipart`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body: multipartRequestBody,
            },
            60000 // 60 second timeout for upload
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to upload backup');
        }

        const data = await response.json();

        return {
            id: data.id,
            name: data.name,
            mimeType: data.mimeType,
            createdTime: data.createdTime,
            modifiedTime: data.modifiedTime,
            size: parseInt(data.size || '0'),
        };
    }

    /**
     * List all backups in app folder
     */
    async listBackups(): Promise<DriveFile[]> {
        const accessToken = await googleAuthService.getAccessToken();
        if (!accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        // Ensure folder exists
        const folderId = await this.ensureAppFolder();

        // List files in folder
        const response = await fetchWithTimeout(
            `${DRIVE_API_BASE}/files?q='${folderId}' in parents and trashed=false&orderBy=modifiedTime desc&fields=files(id,name,mimeType,createdTime,modifiedTime,size)`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            },
            30000
        );

        if (!response.ok) {
            throw new Error('Failed to list backups');
        }

        const data = await response.json();

        return (data.files || []).map((file: any) => ({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime,
            size: parseInt(file.size || '0'),
        }));
    }

    /**
     * Download backup from Google Drive
     */
    async downloadBackup(fileId: string): Promise<DriveBackupMetadata> {
        const accessToken = await googleAuthService.getAccessToken();
        if (!accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        // Download file content
        const response = await fetchWithTimeout(
            `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            },
            60000 // 60 second timeout for download
        );

        if (!response.ok) {
            throw new Error('Failed to download backup');
        }

        const data = await response.json();
        return data as DriveBackupMetadata;
    }

    /**
     * Delete backup from Google Drive
     */
    async deleteBackup(fileId: string): Promise<void> {
        const accessToken = await googleAuthService.getAccessToken();
        if (!accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const response = await fetchWithTimeout(
            `${DRIVE_API_BASE}/files/${fileId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            },
            30000
        );

        if (!response.ok) {
            throw new Error('Failed to delete backup');
        }
    }

    /**
     * Get Drive storage quota
     */
    async getStorageQuota(): Promise<DriveQuota> {
        const accessToken = await googleAuthService.getAccessToken();
        if (!accessToken) {
            throw new Error('Not authenticated with Google Drive');
        }

        const response = await fetchWithTimeout(
            `${DRIVE_API_BASE}/about?fields=storageQuota`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            },
            30000
        );

        if (!response.ok) {
            throw new Error('Failed to get storage quota');
        }

        const data = await response.json();
        const quota = data.storageQuota;

        return {
            limit: parseInt(quota.limit || '0'),
            usage: parseInt(quota.usage || '0'),
            usageInDrive: parseInt(quota.usageInDrive || '0'),
        };
    }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();
