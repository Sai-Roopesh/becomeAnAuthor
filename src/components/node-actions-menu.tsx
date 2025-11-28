'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, EyeOff, FileText, Users, MessageSquare, Copy, FileDown, Archive, History, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { generateText } from '@/lib/ai-service';
import { toast } from '@/lib/toast-service';
import { isScene, Scene } from '@/lib/types';
import { extractTextFromTiptapJSON } from '@/lib/editor-utils';
import { storage } from '@/lib/safe-storage';
import { STORAGE_KEYS, FEATURE_FLAGS } from '@/lib/constants';

interface NodeActionsMenuProps {
    nodeId: string;
    nodeType: 'act' | 'chapter' | 'scene';
    onDelete?: (nodeId: string, nodeType: 'act' | 'chapter' | 'scene') => void;
}

export function NodeActionsMenu({ nodeId, nodeType, onDelete }: NodeActionsMenuProps) {
    const node = useLiveQuery(() => db.nodes.get(nodeId), [nodeId]);
    const [isSummarizing, setIsSummarizing] = useState(false);

    if (!node) return null;

    // Scene-specific actions
    const handleSetPOV = async () => {
        if (!isScene(node)) return;
        const pov = prompt('Enter POV character name:');
        if (pov) {
            await db.nodes.update(nodeId, { pov } as Partial<Scene>);
            toast.success('POV updated');
        }
    };

    const handleAddSubtitle = async () => {
        if (!isScene(node)) return;
        const subtitle = prompt('Enter scene subtitle:');
        if (subtitle) {
            await db.nodes.update(nodeId, { subtitle } as Partial<Scene>);
            toast.success('Subtitle updated');
        }
    };

    const handleToggleAIExclusion = async () => {
        if (!isScene(node)) return;
        const current = node.excludeFromAI || false;
        await db.nodes.update(nodeId, { excludeFromAI: !current } as Partial<Scene>);
        toast.success(current ? 'Included in AI context' : 'Excluded from AI context');
    };

    const handleSummarizeScene = async () => {
        if (!isScene(node)) return;
        setIsSummarizing(true);
        const model = storage.getItem<string>(STORAGE_KEYS.LAST_USED_MODEL, '');

        if (!model) {
            toast.error('Please select a model in settings or chat to use AI features.');
            setIsSummarizing(false);
            return;
        }

        try {
            const text = extractTextFromTiptapJSON(node.content);
            const response = await generateText({
                model,
                system: 'You are a helpful assistant that summarizes creative writing scenes.',
                prompt: `Summarize this scene in 2-3 sentences:\n\n${text}`,
                maxTokens: 500,
            });

            const summary = response.text;
            if (summary) {
                await db.nodes.update(nodeId, { summary } as Partial<Scene>);
                toast.success('Scene summarized successfully!');
            }
        } catch (error) {
            console.error('Summarization failed', error);
            toast.error(`Failed to summarize scene: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleDuplicate = async () => {
        if (!isScene(node)) return;
        const newScene: Scene = {
            ...node,
            id: crypto.randomUUID(),
            title: `${node.title} (Copy)`,
            order: (node.order || 0) + 0.5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await db.nodes.add(newScene);
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

    const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

    const handleArchive = async () => {
        if (!isScene(node)) return;
        setIsArchiveDialogOpen(true);
    };

    const executeArchive = async () => {
        await db.nodes.update(nodeId, { archived: true } as Partial<Scene>);
        toast.success('Scene archived');
        setIsArchiveDialogOpen(false);
    };

    const handleRename = async () => {
        const newTitle = prompt(`Enter new ${nodeType} title:`, node.title);
        if (newTitle && newTitle !== node.title) {
            await db.nodes.update(nodeId, { title: newTitle });
            toast.success(`${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} renamed`);
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

                            <DropdownMenuItem onClick={handleSummarizeScene} disabled={isSummarizing}>
                                <FileText className="h-4 w-4 mr-2" />
                                {isSummarizing ? 'Summarizing...' : 'Summarize Scene'}
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
        </>
    );
}
