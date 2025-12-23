/**
 * Document Export Hook (Tauri Version)
 * 
 * Uses Tauri's export_manuscript_docx command for exporting manuscripts
 * with native file save dialog.
 */
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/shared/utils/toast-service';
import { TauriNodeRepository } from '@/infrastructure/repositories/TauriNodeRepository';
import { showSaveDialog } from '@/core/tauri/commands';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('DocumentExport');

export function useDocumentExport() {

    const exportProjectAsDocx = async (projectId: string) => {
        try {
            const projectPath = TauriNodeRepository.getInstance().getProjectPath();
            if (!projectPath) throw new Error('No project selected');

            // Show native save dialog first
            const defaultName = `manuscript-${new Date().toISOString().split('T')[0]}.docx`;
            const savePath = await showSaveDialog({
                defaultPath: defaultName,
                filters: [{ name: 'Word Document', extensions: ['docx'] }],
                title: 'Export Manuscript'
            });

            if (!savePath) {
                toast.info('Export cancelled');
                return;
            }

            toast.info('Generating DOCX...');

            // Call Rust command which writes directly to file
            await invoke<string>('export_manuscript_docx', {
                projectPath,
                outputPath: savePath
            });

            toast.success('Manuscript exported as DOCX');
            log.debug('DOCX exported', { path: savePath });
        } catch (error) {
            log.error('DOCX export failed', error);
            toast.error('Failed to export manuscript');
        }
    };

    return { exportProjectAsDocx };
}

