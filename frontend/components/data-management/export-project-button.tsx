'use client';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Download, FileText, Cloud, FileCode } from 'lucide-react';
import { useImportExport } from '@/hooks/use-import-export';
import { useGoogleAuth } from '@/features/google-drive/hooks/use-google-auth';
import { useDocumentExport } from '@/hooks/use-document-export';
import { toast } from '@/shared/utils/toast-service';
import { useState } from 'react';
import { ExportDialog } from '@/features/export/components/export-dialog';

interface ExportProjectButtonProps {
    projectId: string;
    onExportStart?: () => void;
}

export function ExportProjectButton({ projectId, onExportStart }: ExportProjectButtonProps) {
    const { exportProject, backupToGoogleDrive } = useImportExport();
    const { exportProjectAsDocx } = useDocumentExport();
    const { isAuthenticated, signIn } = useGoogleAuth();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);

    const handleJsonExport = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onExportStart) onExportStart();
        await exportProject(projectId);
    };

    const handleDocxExport = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onExportStart) onExportStart();
        await exportProjectAsDocx(projectId);
    };

    const handleDriveBackup = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if authenticated
        if (!isAuthenticated) {
            toast.info('Connecting to Google Drive...');
            const result = await signIn().catch(() => null);
            if (!result) {
                toast.error('Failed to connect to Google Drive');
            }
            // After sign-in redirect, user will need to try again
            return;
        }

        // Perform backup
        try {
            setIsBackingUp(true);
            if (onExportStart) onExportStart();
            await backupToGoogleDrive(projectId);
            toast.success('Project backed up to Google Drive!');
        } catch (error) {
            console.error('Drive backup failed:', error);
            toast.error(error instanceof Error ? error.message : 'Backup to Drive failed');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleTemplateExport = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onExportStart) onExportStart();
        setShowExportDialog(true);
    };

    return (
        <>
            <DropdownMenuItem onClick={handleTemplateExport}>
                <FileCode className="h-4 w-4 mr-2" />
                Export with Templates...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleJsonExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Project JSON (Backup)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDocxExport}>
                <FileText className="h-4 w-4 mr-2" />
                Export Manuscript DOCX
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDriveBackup} disabled={isBackingUp}>
                <Cloud className="h-4 w-4 mr-2" />
                {isBackingUp ? 'Backing up...' : 'Backup to Google Drive'}
            </DropdownMenuItem>

            <ExportDialog
                projectId={projectId}
                open={showExportDialog}
                onOpenChange={setShowExportDialog}
            />
        </>
    );
}
