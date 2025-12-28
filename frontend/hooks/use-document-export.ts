/**
 * Document Export Hook (Tauri Version)
 * 
 * Uses Tauri's export_manuscript_docx command for exporting manuscripts
 * with native file save dialog.
 * 
 * Also supports template-based exports using DocumentExportService.
 */
import { invoke } from '@tauri-apps/api/core';
import { toast } from '@/shared/utils/toast-service';
import { TauriNodeRepository } from '@/infrastructure/repositories/TauriNodeRepository';
import { showSaveDialog } from '@/core/tauri/commands';
import { logger } from '@/shared/utils/logger';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { useState } from 'react';
import type { ExportPreset, ExportConfig } from '@/domain/types/export-types';

const log = logger.scope('DocumentExport');

export function useDocumentExport() {
    const { exportService } = useAppServices();
    const [isExporting, setIsExporting] = useState(false);

    /**
     * Export using Tauri backend (DOCX only)
     * Legacy method for backward compatibility
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const exportProjectAsDocx = async (_projectId: string) => {
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

    // ===== NEW: Template-Based Export Methods =====

    /**
     * Export with a preset template
     */
    const exportWithPreset = async (
        projectId: string,
        preset: ExportPreset,
        customConfig?: Partial<ExportConfig>
    ) => {
        setIsExporting(true);
        try {
            toast.info(`Generating ${preset.name}...`);

            // Generate filename
            const filename = generateFilename(preset);
            const extension = getExtensionForFormat(preset.defaultFormat);

            // Show native save dialog
            const savePath = await showSaveDialog({
                defaultPath: filename,
                filters: [{ name: preset.name, extensions: [extension] }],
                title: 'Export Manuscript'
            });

            if (!savePath) {
                toast.info('Export cancelled');
                setIsExporting(false);
                return;
            }

            const blob = await exportService.exportWithPreset(projectId, preset, customConfig);

            // Write blob to file using Rust command
            const buffer = await blob.arrayBuffer();
            const data = Array.from(new Uint8Array(buffer));
            await invoke('write_export_file', { filePath: savePath, data });

            toast.success(`Exported to ${savePath.split('/').pop()}`);
            log.debug('Export complete', { preset: preset.id, path: savePath });
        } catch (error) {
            log.error('Export failed', error);
            toast.error('Failed to export manuscript');
            throw error;
        } finally {
            setIsExporting(false);
        }
    };

    /**
     * Export to ePub format
     */
    const exportToEpub = async (
        projectId: string,
        config: ExportConfig
    ) => {
        setIsExporting(true);
        try {
            toast.info('Generating ePub...');

            const blob = await exportService.exportToEpub(projectId, config);

            // Download the blob
            const filename = `${config.epubMetadata?.title || 'manuscript'}.epub`;
            downloadBlob(blob, filename);

            toast.success('ePub exported successfully!');
            log.debug('ePub exported', { filename });
        } catch (error) {
            log.error('ePub export failed', error);
            toast.error('Failed to export ePub');
            throw error;
        } finally {
            setIsExporting(false);
        }
    };

    /**
     * Export to PDF (frontend version)
     */
    const exportToPDF = async (
        projectId: string,
        config?: ExportConfig
    ) => {
        setIsExporting(true);
        try {
            toast.info('Generating PDF...');

            // Build options without undefined values
            const options: import('@/domain/services/IExportService').ExportOptions = {};
            if (config?.includeTOC !== undefined) options.includeTOC = config.includeTOC;
            if (config?.epubMetadata?.title !== undefined) options.title = config.epubMetadata.title;
            if (config?.epubMetadata?.author !== undefined) options.author = config.epubMetadata.author;

            // Use the service's PDF export
            const blob = await exportService.exportToPDF(projectId, options);

            const filename = `${config?.epubMetadata?.title || 'manuscript'}.pdf`;
            downloadBlob(blob, filename);

            toast.success('PDF exported successfully!');
            log.debug('PDF exported', { filename });
        } catch (error) {
            log.error('PDF export failed', error);
            toast.error('Failed to export PDF');
            throw error;
        } finally {
            setIsExporting(false);
        }
    };

    return {
        // Legacy method
        exportProjectAsDocx,

        // New template-based methods
        exportWithPreset,
        exportToEpub,
        exportToPDF,
        isExporting,
    };
}

// ===== Helper Functions =====

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Generate filename based on preset and date
 */
function generateFilename(preset: ExportPreset): string {
    const date = new Date().toISOString().split('T')[0];
    const extension = getExtensionForFormat(preset.defaultFormat);
    return `manuscript-${preset.id}-${date}.${extension}`;
}

/**
 * Get file extension for export format
 */
function getExtensionForFormat(format: import('@/domain/types/export-types').ExportFormat): string {
    switch (format) {
        case 'docx': return 'docx';
        case 'pdf': return 'pdf';
        case 'epub': return 'epub';
        case 'markdown': return 'md';
        default: return 'txt';
    }
}
