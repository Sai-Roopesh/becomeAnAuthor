/**
 * Import/Export Hook (Tauri Version)
 * 
 * Provides project-level backup and restore functionality,
 * including Google Drive cloud backup integration.
 */
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/shared/utils/toast-service';
import { TauriNodeRepository } from '@/infrastructure/repositories/TauriNodeRepository';
import { ExportedProjectSchema } from '@/shared/schemas/import-schema';
import { googleAuthService } from '@/infrastructure/services/google-auth-service';
import { googleDriveService } from '@/infrastructure/services/google-drive-service';
import { exportProjectAsJson } from '@/core/tauri/commands';
import type { DriveFile, DriveBackupMetadata } from '@/lib/config/types';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('ImportExport');

export function useImportExport() {

    const exportFullBackup = async () => {
        toast.info('Full database backup not available in desktop mode. Use project export instead.');
    };

    const importFullBackup = async (file: File) => {
        toast.info('Full database restore not available in desktop mode. Use project import instead.');
    };

    const exportProject = async (projectId: string) => {
        try {
            const projectPath = TauriNodeRepository.getInstance().getProjectPath();
            if (!projectPath) throw new Error('No project selected');

            // Use Tauri's built-in export command
            const backupPath = await invoke<string>('export_project_backup', {
                projectPath,
                outputPath: null // Let Rust choose default location
            });

            toast.success(`Project exported to ${backupPath}`);
            return backupPath;
        } catch (error) {
            log.error('Project export failed', error);
            toast.error('Failed to export project.');
            throw error;
        }
    };

    const importProject = async (file: File): Promise<string> => {
        try {
            // 1. Read file content
            const fileContent = await file.text();

            // 2. Parse JSON
            let parsedData: unknown;
            try {
                parsedData = JSON.parse(fileContent);
            } catch (e) {
                toast.error('Invalid file: not a valid JSON file');
                throw new Error('Invalid JSON file');
            }

            // 3. Validate with Zod schema
            const validationResult = ExportedProjectSchema.safeParse(parsedData);

            if (!validationResult.success) {
                log.error('Validation errors:', validationResult.error.issues);
                toast.error('Invalid backup file format. Please use a valid project backup.');
                throw new Error('Schema validation failed');
            }

            // 4. Call Rust import command
            const result = await invoke<{ id: string; title: string }>('import_project_backup', {
                backupJson: fileContent
            });

            toast.success(`Project "${result.title}" imported successfully!`);
            return result.id;
        } catch (error) {
            if (error instanceof Error && error.message.includes('validation')) {
                // Already handled above
                throw error;
            }
            log.error('Project import failed', error);
            toast.error('Failed to import project. Please try again.');
            throw error;
        }
    };

    /**
     * Backup current project to Google Drive
     */
    const backupToGoogleDrive = async (projectId: string): Promise<DriveFile | null> => {
        try {
            // 1. Check authentication
            if (!googleAuthService.isAuthenticated()) {
                toast.info('Please sign in with Google to backup to Drive.');
                await googleAuthService.signIn();
                return null; // Will redirect, user needs to retry after callback
            }

            // 2. Get project path
            const projectPath = TauriNodeRepository.getInstance().getProjectPath();
            if (!projectPath) {
                toast.error('No project selected');
                throw new Error('No project selected');
            }

            toast.info('Preparing backup...');

            // 3. Export project as JSON string
            const backupJson = await exportProjectAsJson(projectPath);
            const backupData = JSON.parse(backupJson) as { project?: { title?: string } };

            // 4. Generate filename with timestamp
            const projectTitle = backupData.project?.title || 'Untitled';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${projectTitle}_backup_${timestamp}.json`;

            // 5. Upload to Google Drive
            // The backup structure from Rust matches what Google Drive service expects
            const result = await googleDriveService.uploadBackup(backupData as unknown as DriveBackupMetadata, fileName);

            toast.success(`Backup saved to Google Drive: ${result.name}`);
            log.debug('Backup uploaded', { fileId: result.id, name: result.name });
            return result;
        } catch (error) {
            log.error('Google Drive backup failed', error);
            toast.error('Failed to backup to Google Drive. Please try again.');
            throw error;
        }
    };

    /**
     * Restore project from Google Drive backup
     */
    const restoreFromGoogleDrive = async (fileId: string): Promise<string> => {
        try {
            // 1. Check authentication
            if (!googleAuthService.isAuthenticated()) {
                toast.info('Please sign in with Google to restore from Drive.');
                await googleAuthService.signIn();
                return '';
            }

            toast.info('Downloading backup from Google Drive...');

            // 2. Download the backup file
            const backupData = await googleDriveService.downloadBackup(fileId);
            const backupJson = JSON.stringify(backupData);

            // 3. Validate with schema
            const validationResult = ExportedProjectSchema.safeParse(backupData);
            if (!validationResult.success) {
                log.error('Drive backup validation failed', validationResult.error.issues);
                toast.error('Invalid backup file. The file may be corrupted.');
                throw new Error('Schema validation failed');
            }

            // 4. Import to local project
            const result = await invoke<{ id: string; title: string }>('import_project_backup', {
                backupJson
            });

            toast.success(`Project "${result.title}" restored from Google Drive!`);
            return result.id;
        } catch (error) {
            log.error('Google Drive restore failed', error);
            toast.error('Failed to restore from Google Drive. Please try again.');
            throw error;
        }
    };

    /**
     * List all backups in Google Drive
     */
    const listDriveBackups = async (): Promise<DriveFile[]> => {
        try {
            if (!googleAuthService.isAuthenticated()) {
                return [];
            }
            return await googleDriveService.listBackups();
        } catch (error) {
            log.error('Failed to list Drive backups', error);
            return [];
        }
    };

    return {
        exportFullBackup,
        importFullBackup,
        exportProject,
        importProject,
        backupToGoogleDrive,
        restoreFromGoogleDrive,
        listDriveBackups,
    };
}
