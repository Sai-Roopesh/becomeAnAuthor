'use client';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Database, Download, FileJson, Upload, Loader2 } from 'lucide-react';
import { useImportExport } from '@/hooks/use-import-export';
import { useRef, useState } from 'react';
import { useConfirmation } from '@/hooks/use-confirmation';
import { invalidateQueries } from '@/hooks/use-live-query';
import { toast } from '@/shared/utils/toast-service';

export function DataManagementMenu() {
    const { exportFullBackup, importFullBackup, importProject } = useImportExport();
    const backupInputRef = useRef<HTMLInputElement>(null);
    const projectInputRef = useRef<HTMLInputElement>(null);

    // Loading states for async operations
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const { confirm, ConfirmationDialog } = useConfirmation();

    const handleBackupRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const confirmed = await confirm({
                title: 'Restore Database',
                description: 'WARNING: Restoring a backup will OVERWRITE all current data. This cannot be undone. Are you sure you want to proceed?',
                confirmText: 'Restore & Overwrite',
                variant: 'destructive'
            });

            if (confirmed) {
                setIsRestoring(true);
                try {
                    await importFullBackup(file);
                } finally {
                    setIsRestoring(false);
                }
            }
        }
        // Reset input
        if (backupInputRef.current) backupInputRef.current.value = '';
    };

    const handleProjectImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsImporting(true);
            try {
                const newProjectId = await importProject(file).catch((err) => {
                    toast.error(err?.message || 'Failed to import project');
                    return null;
                });
                if (newProjectId) {
                    invalidateQueries(); // Refresh to show new project
                }
            } finally {
                setIsImporting(false);
            }
        }
        // Reset input
        if (projectInputRef.current) projectInputRef.current.value = '';
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportFullBackup();
        } finally {
            setIsExporting(false);
        }
    };

    const isLoading = isImporting || isExporting || isRestoring;

    return (
        <>
            <input
                type="file"
                ref={backupInputRef}
                className="hidden"
                accept=".json"
                onChange={handleBackupRestore}
                disabled={isLoading}
            />
            <input
                type="file"
                ref={projectInputRef}
                className="hidden"
                accept=".json"
                onChange={handleProjectImport}
                disabled={isLoading}
            />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Database className="h-4 w-4" />
                        )}
                        {isImporting ? 'Importing...' : isExporting ? 'Exporting...' : isRestoring ? 'Restoring...' : 'Data'}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={() => projectInputRef.current?.click()}
                        disabled={isLoading}
                    >
                        {isImporting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <FileJson className="h-4 w-4 mr-2" />
                        )}
                        {isImporting ? 'Importing...' : 'Import Project JSON'}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuLabel>Database Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleExport} disabled={isLoading}>
                        {isExporting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        {isExporting ? 'Exporting...' : 'Backup Full Database'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => backupInputRef.current?.click()}
                        className="text-destructive focus:text-destructive"
                        disabled={isLoading}
                    >
                        {isRestoring ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Upload className="h-4 w-4 mr-2" />
                        )}
                        {isRestoring ? 'Restoring...' : 'Restore Database'}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmationDialog />
        </>
    );
}
