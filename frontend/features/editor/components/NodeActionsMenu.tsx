'use client';

import { useLiveQuery } from '@/hooks/use-live-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MoreVertical, Eye, EyeOff, FileText, Copy, FileDown, Archive, History, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useAI } from '@/hooks/use-ai';
import { toast } from '@/shared/utils/toast-service';
import { isScene } from '@/domain/entities/types';
import { extractTextFromTiptapJSON } from '@/shared/utils/editor';
import { useAppServices } from '@/infrastructure/di/AppContext';
import { logger } from '@/shared/utils/logger';

const log = logger.scope('NodeActionsMenu');

interface NodeActionsMenuProps {
    nodeId: string;
    nodeType: 'act' | 'chapter' | 'scene';
    onDelete?: (nodeId: string, nodeType: 'act' | 'chapter' | 'scene') => void;
}

export function NodeActionsMenu({ nodeId, nodeType, onDelete }: NodeActionsMenuProps) {
    const { nodeRepository: nodeRepo } = useAppServices();
    const node = useLiveQuery(() => nodeRepo.get(nodeId), [nodeId, nodeRepo]);
    const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [isPovDialogOpen, setIsPovDialogOpen] = useState(false);
    const [isSubtitleDialogOpen, setIsSubtitleDialogOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [povValue, setPovValue] = useState('');
    const [subtitleValue, setSubtitleValue] = useState('');
    const { generate, isGenerating } = useAI({
        system: `You are an expert story analyst specializing in scene summarization.

SUMMARIZATION FRAMEWORK:
1. Goal: What does the POV character want in this scene?
2. Conflict: What obstacles or opposition do they face?
3. Outcome: How does the scene end? (Success, failure, complication?)
4. Value Change: What shifts emotionally or situationally?

STYLE:
- Concise: 2-3 sentences maximum
- Present tense: "Sarah confronts..." not "Sarah confronted..."
- Focus on action and change, not description
- Highlight turning points

EXAMPLE:
"Marcus infiltrates the gala to steal classified files. Security recognizes him from surveillance footage, forcing an improvised escape through the kitchen. He escapes but without the files—and now they know he's onto them."`,
        operationName: 'Scene Summarization',
    });

    if (!node) return null;

    // Scene-specific actions
    const handleSetPOV = async () => {
        if (!isScene(node)) return;
        setPovValue(node.pov || '');
        setIsPovDialogOpen(true);
    };

    const executePovUpdate = async () => {
        if (!isScene(node)) return;
        try {
            await nodeRepo.updateMetadata(nodeId, { pov: povValue || '' });
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();
            toast.success(povValue ? `POV set to "${povValue}"` : 'POV cleared');
            setIsPovDialogOpen(false);
            setPovValue('');
        } catch (error) {
            log.error('Failed to update POV', error);
            toast.error('Failed to update POV');
        }
    };

    const handleAddSubtitle = async () => {
        if (!isScene(node)) return;
        setSubtitleValue(node.subtitle || '');
        setIsSubtitleDialogOpen(true);
    };

    const executeSubtitleUpdate = async () => {
        if (!isScene(node)) return;
        try {
            await nodeRepo.updateMetadata(nodeId, { subtitle: subtitleValue || '' });
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();
            toast.success(subtitleValue ? `Subtitle set to "${subtitleValue}"` : 'Subtitle cleared');
            setIsSubtitleDialogOpen(false);
            setSubtitleValue('');
        } catch (error) {
            log.error('Failed to update subtitle', error);
            toast.error('Failed to update subtitle');
        }
    };

    const handleToggleAIExclusion = async () => {
        if (!isScene(node)) return;
        const current = node.excludeFromAI || false;
        await nodeRepo.updateMetadata(nodeId, { excludeFromAI: !current });
        const { invalidateQueries } = await import('@/hooks/use-live-query');
        invalidateQueries();
        toast.success(current ? 'Included in AI context' : 'Excluded from AI context');
    };

    const handleSummarizeScene = async () => {
        if (!isScene(node)) return;

        const text = extractTextFromTiptapJSON(node.content);
        const result = await generate({
            prompt: `Summarize this scene using the framework:
1. Goal (what character wants)
2. Conflict (what opposes them)
3. Outcome (success/failure/complication)
4. Value Change (what shifts)

SCENE TEXT:
${text}

SUMMARY (2-3 sentences, present tense):`,
            maxTokens: 300,
        });

        if (result) {
            await nodeRepo.updateMetadata(nodeId, { summary: result });
            const { invalidateQueries } = await import('@/hooks/use-live-query');
            invalidateQueries();
        }
    };

    const handleDuplicate = async () => {
        if (!isScene(node)) return;
        await nodeRepo.create({
            ...node,
            title: `${node.title} (Copy)`,
            order: (node.order || 0) + 0.5,
            type: 'scene',
            projectId: node.projectId,
        });
        const { invalidateQueries } = await import('@/hooks/use-live-query');
        invalidateQueries();
        toast.success('Scene duplicated');
    };

    const handleCopyProse = async () => {
        if (!isScene(node)) return;
        const text = extractTextFromTiptapJSON(node.content);
        await navigator.clipboard.writeText(text);
        toast.success('Prose copied to clipboard!');
    };

    const handleExport = () => {
        if (!isScene(node)) return;
        const text = extractTextFromTiptapJSON(node.content);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${node.title}.txt`;
        a.click();
        toast.success('Scene exported');
    };



    const handleArchive = async () => {
        if (!isScene(node)) return;
        setIsArchiveDialogOpen(true);
    };

    const executeArchive = async () => {
        await nodeRepo.update(nodeId, { archived: true });
        const { invalidateQueries } = await import('@/hooks/use-live-query');
        invalidateQueries();
        toast.success('Scene archived');
        setIsArchiveDialogOpen(false);
    };

    const handleRename = () => {
        log.debug('Opening rename dialog', { nodeId, nodeType });
        setRenameValue(node.title);
        setIsRenameDialogOpen(true);
    };

    const executeRename = async () => {
        try {
            log.debug('executeRename called', { renameValue });

            if (renameValue && renameValue !== node.title) {
                log.debug('Calling nodeRepo.update');
                await nodeRepo.update(nodeId, { title: renameValue });
                log.debug('Update completed, invalidating queries');

                // Refresh UI to show the new title
                const { invalidateQueries } = await import('@/hooks/use-live-query');
                invalidateQueries();
                log.debug('Queries invalidated');

                toast.success(`${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} renamed`);
                setIsRenameDialogOpen(false);
            } else {
                log.debug('Rename cancelled or same title');
            }
        } catch (error) {
            log.error('Rename failed', error);
            toast.error(`Failed to rename ${nodeType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleDeleteClick = () => {
        if (onDelete) {
            onDelete(nodeId, nodeType);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    {/* Common actions for all node types */}
                    <DropdownMenuItem onClick={handleRename}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                    </DropdownMenuItem>

                    {/* Scene-specific actions */}
                    {nodeType === 'scene' && isScene(node) && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSetPOV}>
                                <Eye className="h-4 w-4 mr-2" />
                                Set Custom POV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleToggleAIExclusion}>
                                <EyeOff className="h-4 w-4 mr-2" />
                                {node.excludeFromAI ? 'Include in AI Context' : 'Exclude from AI Context'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleAddSubtitle}>
                                <FileText className="h-4 w-4 mr-2" />
                                Add Subtitle
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>AI Actions</DropdownMenuLabel>

                            <DropdownMenuItem onClick={handleSummarizeScene} disabled={isGenerating}>
                                <FileText className="h-4 w-4 mr-2" />
                                {isGenerating ? 'Summarizing...' : 'Summarize Scene'}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={handleDuplicate}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate Scene
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>History</DropdownMenuLabel>

                            <DropdownMenuItem>
                                <History className="h-4 w-4 mr-2" />
                                Scene Summary
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <History className="h-4 w-4 mr-2" />
                                Scene Contents
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={handleCopyProse}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Scene Prose
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExport}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export Scene
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleArchive}>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive Scene
                            </DropdownMenuItem>
                        </>
                    )}

                    {/* Delete (for all types) */}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Archive Scene</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to archive this scene? It will be moved to the archive list.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={executeArchive}>
                            Archive
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}</DialogTitle>
                        <DialogDescription>
                            Enter a new name for this {nodeType}.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                executeRename();
                            }
                        }}
                        placeholder={`${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} name`}
                        autoFocus
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={executeRename}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPovDialogOpen} onOpenChange={setIsPovDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set POV Character</DialogTitle>
                        <DialogDescription>
                            Enter the point-of-view character for this scene. Leave empty to use the default.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={povValue}
                        onChange={(e) => setPovValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                executePovUpdate();
                            }
                        }}
                        placeholder="e.g., John Smith, Narrator, etc."
                        autoFocus
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPovDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={executePovUpdate}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isSubtitleDialogOpen} onOpenChange={setIsSubtitleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Subtitle</DialogTitle>
                        <DialogDescription>
                            Add a subtitle or description for this scene.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={subtitleValue}
                        onChange={(e) => setSubtitleValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                executeSubtitleUpdate();
                            }
                        }}
                        placeholder="e.g., Three days later, In the abandoned warehouse..."
                        autoFocus
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSubtitleDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={executeSubtitleUpdate}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
