/**
 * Import/Export Hook (Tauri Version)
 * 
 * Provides project-level backup and restore functionality.
 */
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/shared/utils/toast-service';
import { getCurrentProjectPath } from '@/infrastructure/repositories/TauriNodeRepository';
import { ExportedProjectSchema } from '@/shared/schemas/import-schema';

export function useImportExport() {

    const exportFullBackup = async () => {
        toast.info('Full database backup not available in desktop mode. Use project export instead.');
    };

    const importFullBackup = async (file: File) => {
        toast.info('Full database restore not available in desktop mode. Use project import instead.');
    };

    const exportProject = async (projectId: string) => {
        try {
            const projectPath = getCurrentProjectPath();
            if (!projectPath) throw new Error('No project selected');

            // Use Tauri's built-in export command
            const backupPath = await invoke<string>('export_project_backup', {
                projectPath,
                outputPath: null // Let Rust choose default location
            });

            toast.success(`Project exported to ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('Project export failed:', error);
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
                console.error('Validation errors:', validationResult.error.issues);
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
            console.error('Project import failed:', error);
            toast.error('Failed to import project. Please try again.');
            throw error;
        }
    };

    const backupToGoogleDrive = async (projectId: string): Promise<void> => {
        toast.info('Google Drive backup coming soon.');
    };

    const restoreFromGoogleDrive = async (fileId: string): Promise<string> => {
        toast.info('Google Drive restore coming soon.');
        return '';
    };

    const listDriveBackups = async () => {
        return [];
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
