'use client';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Download, FileText, Cloud } from 'lucide-react';
import { useImportExport } from '@/hooks/use-import-export';
import { useGoogleAuth } from '@/hooks/use-google-auth';
import { useDocumentExport } from '@/hooks/use-document-export';
import { toast } from '@/lib/toast-service';
import { useState } from 'react';

interface ExportProjectButtonProps {
    projectId: string;
    onExportStart?: () => void;
}

export function ExportProjectButton({ projectId, onExportStart }: ExportProjectButtonProps) {
    const { exportProject, backupToGoogleDrive } = useImportExport();
    const { exportProjectAsDocx } = useDocumentExport();
    const { isAuthenticated, signIn } = useGoogleAuth();
    const [isBackingUp, setIsBackingUp] = useState(false);

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
            try {
                await signIn();
                // After sign-in redirect, user will need to try again
                return;
            } catch (error) {
                toast.error('Failed to connect to Google Drive');
                return;
            }
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

    return (
        <>
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
        </>
    );
}
