'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExportPresets } from '../hooks/use-export-presets';
import { useExportPreview } from '../hooks/use-export-preview';
import { useDocumentExport } from '@/hooks/use-document-export';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { useLiveQuery } from '@/hooks/use-live-query';
import type { ExportConfig } from '@/domain/types/export-types';

interface ExportDialogProps {
    projectId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Main export dialog with template selection, configuration, and preview
 */
export function ExportDialog({ projectId, open, onOpenChange }: ExportDialogProps) {
    const { nodeRepository, projectRepository } = useAppServices();
    const { presets, selectedPreset, setSelectedPreset, isLoading: presetsLoading } = useExportPresets();
    const { exportWithPreset, isExporting } = useDocumentExport();
    const {
        preview,
        currentPage,
        isGenerating,
        hasPreview,
        totalPages,
        canGoNext,
        canGoPrevious,
        generatePreview,
        nextPage,
        previousPage,
        clearPreview,
    } = useExportPreview(projectId);

    // Fetch project data to get title and author
    const project = useLiveQuery(
        async () => {
            return await projectRepository.get(projectId);
        },
        [projectId, projectRepository]
    );

    const [customConfig, setCustomConfig] = useState<Partial<ExportConfig>>({});
    const [activeTab, setActiveTab] = useState<'presets' | 'config' | 'preview'>('presets');

    // Auto-populate Title and Author from project data
    useEffect(() => {
        if (project && open) {
            setCustomConfig(prev => ({
                ...prev,
                epubMetadata: {
                    ...prev.epubMetadata,
                    title: prev.epubMetadata?.title || project.title || '',
                    author: prev.epubMetadata?.author || project.author || '',
                },
            }));
        }
    }, [project, open]);

    const handleExport = async () => {
        if (!selectedPreset) return;

        try {
            await exportWithPreset(projectId, selectedPreset, customConfig);
            onOpenChange(false);
            // Reset state
            setCustomConfig({});
            clearPreview();
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const handlePreview = async () => {
        if (!selectedPreset) return;
        await generatePreview(selectedPreset, customConfig);
        setActiveTab('preview');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Export Manuscript</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="presets">Templates</TabsTrigger>
                        <TabsTrigger value="config" disabled={!selectedPreset}>
                            Configuration
                        </TabsTrigger>
                        <TabsTrigger value="preview" disabled={!hasPreview}>
                            Preview {hasPreview && `(${totalPages})`}
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        <TabsContent value="presets" className="h-full overflow-y-auto mt-4">
                            {presetsLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-muted-foreground">Loading presets...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 p-4">
                                    {presets.map((preset) => (
                                        <button
                                            key={preset.id}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSelectedPreset(preset);
                                                setActiveTab('config');
                                            }}
                                            className={`p-4 border-2 rounded-lg text-left transition-all hover:border-primary ${selectedPreset?.id === preset.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border'
                                                }`}
                                        >
                                            <h3 className="font-semibold text-lg mb-2">{preset.name}</h3>
                                            <p className="text-sm text-muted-foreground mb-3">{preset.description}</p>
                                            <div className="flex gap-2 flex-wrap">
                                                {preset.supportedFormats.map((format) => (
                                                    <span
                                                        key={format}
                                                        className="text-xs px-2 py-1 rounded bg-secondary"
                                                    >
                                                        {format.toUpperCase()}
                                                    </span>
                                                ))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="config" className="h-full overflow-y-auto mt-4">
                            {selectedPreset ? (
                                <div className="p-4 space-y-4">
                                    <div className="rounded-lg border p-4 bg-muted/50">
                                        <h3 className="font-semibold mb-2">Selected Template</h3>
                                        <p className="text-sm text-muted-foreground">{selectedPreset.name}</p>
                                    </div>

                                    <div className="rounded-lg border p-4">
                                        <h3 className="font-semibold mb-3">Basic Configuration</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm font-medium">Title</label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter title..."
                                                    className="w-full mt-1 px-3 py-2 border rounded"
                                                    value={customConfig.epubMetadata?.title || ''}
                                                    onChange={(e) =>
                                                        setCustomConfig({
                                                            ...customConfig,
                                                            epubMetadata: {
                                                                ...customConfig.epubMetadata,
                                                                title: e.target.value,
                                                            },
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">Author</label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter author name..."
                                                    className="w-full mt-1 px-3 py-2 border rounded"
                                                    value={customConfig.epubMetadata?.author || ''}
                                                    onChange={(e) =>
                                                        setCustomConfig({
                                                            ...customConfig,
                                                            epubMetadata: {
                                                                ...customConfig.epubMetadata,
                                                                author: e.target.value,
                                                            },
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        <p>
                                            Full configuration options (front/back matter, CSS themes) will be available in
                                            the next update.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-muted-foreground">Select a template first</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="preview" className="h-full flex flex-col mt-4">
                            {hasPreview ? (
                                <div className="flex-1 min-h-0 flex flex-col">
                                    <div className="flex items-center justify-between mb-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={previousPage}
                                                disabled={!canGoPrevious}
                                            >
                                                Previous
                                            </Button>
                                            <span className="text-sm text-muted-foreground">
                                                Page {currentPage + 1} of {totalPages}
                                            </span>
                                            <Button variant="outline" size="sm" onClick={nextPage} disabled={!canGoNext}>
                                                Next
                                            </Button>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={clearPreview}>
                                            Close Preview
                                        </Button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-white">
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: preview[currentPage]?.content || '',
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-muted-foreground">No preview available</p>
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handlePreview}
                            disabled={!selectedPreset || isGenerating}
                        >
                            {isGenerating ? 'Generating...' : 'Preview'}
                        </Button>
                        <Button onClick={handleExport} disabled={!selectedPreset || isExporting}>
                            {isExporting ? 'Exporting...' : 'Export'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
