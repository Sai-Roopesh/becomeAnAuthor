"use client";

/**
 * Google Drive API Service
 * Handles backup and restore operations to user's Google Drive
 */

import { googleAuthService } from "./google-auth-service";
import type {
  DriveFile,
  DriveQuota,
  DriveBackupMetadata,
} from "@/domain/entities/types";
import { fetchWithTimeout } from "@/core/api/fetch-utils";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_API_BASE = "https://www.googleapis.com/upload/drive/v3";
const APP_FOLDER_NAME = "BecomeAnAuthor";

interface GoogleDriveApiFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

interface GoogleDriveErrorPayload {
  error?: {
    message?: string;
  };
  message?: string;
}

class GoogleDriveService {
  private async withAccessToken<T>(
    operation: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const accessToken = await googleAuthService.getAccessToken();
    if (!accessToken) {
      throw new Error("Not authenticated with Google Drive");
    }
    return operation(accessToken);
  }

  private parseSize(value?: string): number {
    const parsed = Number.parseInt(value || "0", 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toDriveFile(file: GoogleDriveApiFile): DriveFile {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      size: this.parseSize(file.size),
    };
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as GoogleDriveErrorPayload;
      return payload.error?.message || payload.message || response.statusText;
    } catch {
      return response.statusText;
    }
  }

  private async requestJson<T>(
    accessToken: string,
    url: string,
    options: Omit<RequestInit, "signal">,
    timeoutMs: number,
    errorPrefix: string,
  ): Promise<T> {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(options.headers || {}),
        },
      },
      timeoutMs,
    );

    if (!response.ok) {
      const message = await this.readErrorMessage(response);
      throw new Error(`${errorPrefix}: ${message}`);
    }

    return (await response.json()) as T;
  }

  private async requestNoBody(
    accessToken: string,
    url: string,
    options: Omit<RequestInit, "signal">,
    timeoutMs: number,
    errorPrefix: string,
  ): Promise<void> {
    const response = await fetchWithTimeout(
      url,
      {
        ...options,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(options.headers || {}),
        },
      },
      timeoutMs,
    );

    if (!response.ok) {
      const message = await this.readErrorMessage(response);
      throw new Error(`${errorPrefix}: ${message}`);
    }
  }

  /**
   * Ensure app folder exists in user's Drive, create if not
   */
  async ensureAppFolder(): Promise<string> {
    return this.withAccessToken(async (accessToken) => {
      const searchQuery = `${DRIVE_API_BASE}/files?q=name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchData = await this.requestJson<{
        files?: Array<{ id: string }>;
      }>(
        accessToken,
        searchQuery,
        { method: "GET" },
        30000,
        "Failed to search for app folder",
      );

      const existingFolderId = searchData.files?.[0]?.id;
      if (existingFolderId) {
        return existingFolderId;
      }

      const createData = await this.requestJson<{ id: string }>(
        accessToken,
        `${DRIVE_API_BASE}/files`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: APP_FOLDER_NAME,
            mimeType: "application/vnd.google-apps.folder",
          }),
        },
        30000,
        "Failed to create app folder",
      );

      return createData.id;
    });
  }

  /**
   * Upload backup to Google Drive
   */
  async uploadBackup(
    backupData: DriveBackupMetadata,
    fileName: string,
  ): Promise<DriveFile> {
    return this.withAccessToken(async (accessToken) => {
      const folderId = await this.ensureAppFolder();
      const metadata = {
        name: fileName,
        mimeType: "application/json",
        parents: [folderId],
      };

      const boundary = "-------314159265358979323846";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(backupData, null, 2) +
        closeDelimiter;

      const data = await this.requestJson<GoogleDriveApiFile>(
        accessToken,
        `${UPLOAD_API_BASE}/files?uploadType=multipart`,
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        },
        60000,
        "Failed to upload backup",
      );

      return this.toDriveFile(data);
    });
  }

  /**
   * List all backups in app folder
   */
  async listBackups(): Promise<DriveFile[]> {
    return this.withAccessToken(async (accessToken) => {
      const folderId = await this.ensureAppFolder();
      const data = await this.requestJson<{ files?: GoogleDriveApiFile[] }>(
        accessToken,
        `${DRIVE_API_BASE}/files?q='${folderId}' in parents and trashed=false&orderBy=modifiedTime desc&fields=files(id,name,mimeType,createdTime,modifiedTime,size)`,
        { method: "GET" },
        30000,
        "Failed to list backups",
      );

      return (data.files || []).map((file) => this.toDriveFile(file));
    });
  }

  /**
   * Download backup from Google Drive
   */
  async downloadBackup(fileId: string): Promise<DriveBackupMetadata> {
    return this.withAccessToken(async (accessToken) => {
      return await this.requestJson<DriveBackupMetadata>(
        accessToken,
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
        { method: "GET" },
        60000,
        "Failed to download backup",
      );
    });
  }

  /**
   * Delete backup from Google Drive
   */
  async deleteBackup(fileId: string): Promise<void> {
    return this.withAccessToken(async (accessToken) => {
      await this.requestNoBody(
        accessToken,
        `${DRIVE_API_BASE}/files/${fileId}`,
        { method: "DELETE" },
        30000,
        "Failed to delete backup",
      );
    });
  }

  /**
   * Get Drive storage quota
   */
  async getStorageQuota(): Promise<DriveQuota> {
    return this.withAccessToken(async (accessToken) => {
      const data = await this.requestJson<{
        storageQuota: {
          limit?: string;
          usage?: string;
          usageInDrive?: string;
        };
      }>(
        accessToken,
        `${DRIVE_API_BASE}/about?fields=storageQuota`,
        { method: "GET" },
        30000,
        "Failed to get storage quota",
      );

      const quota = data.storageQuota || {};
      return {
        limit: this.parseSize(quota.limit),
        usage: this.parseSize(quota.usage),
        usageInDrive: this.parseSize(quota.usageInDrive),
      };
    });
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();
