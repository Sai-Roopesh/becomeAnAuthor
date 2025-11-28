import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, Cloud, Download, AlertCircle } from 'lucide-react';
import { useImportExport } from '@/hooks/use-import-export';
import { useGoogleAuth } from '@/hooks/use-google-auth';
import { DriveBackupBrowser } from '@/features/google-drive/components/DriveBackupBrowser';
import { InlineGoogleAuth } from '@/features/google-drive/components/InlineGoogleAuth';
import { toast } from '@/lib/toast-service';

export function RestoreProjectDialog() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'local' | 'drive'>('local');
    const { importProject } = useImportExport();
    const { isAuthenticated } = useGoogleAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLocalFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const newProjectId = await importProject(file);
                if (newProjectId) {
                    toast.success('Project restored successfully!');
                    setOpen(false);
                    // Reload to show new project
                    setTimeout(() => window.location.reload(), 500);
                }
            } catch (error) {
                // Error handled in hook
                console.error('Import failed:', error);
            }
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Restore Project
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Restore Project</DialogTitle>
                    <DialogDescription>
                        Restore a project from a backup file or from your Google Drive
                    </DialogDescription>
                </DialogHeader>

                {/* Custom Tab Switcher */}
                <div className="space-y-4">
                    <div className="flex gap-2 p-1 bg-muted rounded-lg">
                        <Button
                            variant={activeTab === 'local' ? 'secondary' : 'ghost'}
                            className="flex-1"
                            onClick={() => setActiveTab('local')}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Local File
                        </Button>
                        <Button
                            variant={activeTab === 'drive' ? 'secondary' : 'ghost'}
                            className="flex-1"
                            onClick={() => setActiveTab('drive')}
                        >
                            <Cloud className="h-4 w-4 mr-2" />
                            Google Drive
                        </Button>
                    </div>
                    {/* Tab Content */}
                    {activeTab === 'local' ? (
                        <div className="space-y-4 pt-4">
                            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Upload className="h-6 w-6 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-medium">Select Backup File</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Choose a .json backup file to restore your project
                                    </p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleLocalFileImport}
                                    className="hidden"
                                />
                                <Button onClick={() => fileInputRef.current?.click()}>
                                    Browse Files
                                </Button>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm space-y-1">
                                        <p className="font-medium text-blue-900 dark:text-blue-100">
                                            About Project Backups
                                        </p>
                                        <p className="text-blue-700 dark:text-blue-300">
                                            Project backups contain everything from a single novel: story structure,
                                            scenes, characters, and more. Restoring creates a new copy alongside your
                                            existing projects.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 pt-4">
                            {!isAuthenticated ? (
                                <InlineGoogleAuth onAuthComplete={() => {/* Refresh will happen automatically */ }} />
                            ) : (
                                <DriveBackupBrowser
                                    onRestore={(fileId: string) => {
                                        setOpen(false);
                                        toast.success('Project restored from Google Drive!');
                                        setTimeout(() => window.location.reload(), 500);
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
