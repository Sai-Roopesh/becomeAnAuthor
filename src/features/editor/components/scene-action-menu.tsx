'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirmation } from '@/hooks/use-confirmation';
import { usePrompt } from '@/hooks/use-prompt';
import { MoreVertical, Eye, EyeOff, FileText, Users, MessageSquare, Copy, FileDown, Archive, History } from 'lucide-react';
import { useState } from 'react';
import { generateText } from '@/lib/ai-service';
import { toast } from '@/lib/toast-service';
import { isScene, Scene } from '@/lib/types';
import { extractTextFromTiptapJSON } from '@/lib/editor-utils';
import { storage } from '@/lib/safe-storage';
import { STORAGE_KEYS, FEATURE_FLAGS } from '@/lib/constants';

interface SceneActionMenuProps {
    sceneId: string;
}

export function SceneActionMenu({ sceneId }: SceneActionMenuProps) {
    const scene = useLiveQuery(() => db.nodes.get(sceneId), [sceneId]);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const { confirm, ConfirmationDialog } = useConfirmation();
    const { prompt, PromptDialog } = usePrompt();

    if (!scene || !isScene(scene)) return null;

    const handleSetPOV = async () => {
        const pov = await prompt({
            title: 'Set POV Character',
            description: 'Enter the name of the point-of-view character for this scene:',
            placeholder: 'Character name...',
            defaultValue: scene?.pov || ''
        });
        if (pov) {
            await db.nodes.update(sceneId, { pov } as Partial<Scene>);
            toast.success('POV updated');
        }
    };

    const handleAddSubtitle = async () => {
        const subtitle = await prompt({
            title: 'Set Scene Subtitle',
            description: 'Enter a subtitle or tagline for this scene:',
            placeholder: 'Subtitle...',
            defaultValue: scene?.subtitle || ''
        });
        if (subtitle) {
            await db.nodes.update(sceneId, { subtitle } as Partial<Scene>);
            toast.success('Subtitle updated');
        }
    };

    const handleToggleAIExclusion = async () => {
        const current = scene.excludeFromAI || false;
        await db.nodes.update(sceneId, { excludeFromAI: !current } as Partial<Scene>);
        toast.success(current ? 'Included in AI context' : 'Excluded from AI context');
    };

    const handleSummarizeScene = async () => {
        setIsSummarizing(true);
        const model = storage.getItem<string>(STORAGE_KEYS.LAST_USED_MODEL, '');

        if (!model) {
            toast.error('Please select a model in settings or chat to use AI features.');
            setIsSummarizing(false);
            return;
        }

        try {
            // Extract text from Tiptap JSON
            const text = extractTextFromTiptapJSON(scene.content);

            const response = await generateText({
                model,
                system: 'You are a helpful assistant that summarizes creative writing scenes.',
                prompt: `Summarize this scene in 2-3 sentences:\n\n${text}`,
                maxTokens: 500,
            });

            const summary = response.text;

            if (summary) {
                await db.nodes.update(sceneId, { summary } as Partial<Scene>);
                toast.success('Scene summarized successfully!');
            }
        } catch (error) {
            console.error('Summarization failed', error);
            toast.error(`Failed to summarize scene: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleDetectCharacters = async () => {
        // Feature hidden by FEATURE_FLAGS
    };

    const handleChatWithScene = () => {
        // Feature hidden by FEATURE_FLAGS
    };

    const handleDuplicate = async () => {
        const newScene: Scene = {
            ...scene,
            id: crypto.randomUUID(),
            title: `${scene.title} (Copy)`,
            order: (scene.order || 0) + 0.5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        await db.nodes.add(newScene);
        toast.success('Scene duplicated');
    };

    const handleCopyProse = async () => {
        const text = extractTextFromTiptapJSON(scene.content);
        await navigator.clipboard.writeText(text);
        toast.success('Prose copied to clipboard!');
    };

    const handleExport = () => {
        const text = extractTextFromTiptapJSON(scene.content);

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scene.title}.txt`;
        a.click();
        toast.success('Scene exported');
    };

    const handleArchive = async () => {
        const confirmed = await confirm({
            title: 'Archive Scene',
            description: 'Are you sure you want to archive this scene? It will be moved to the archive list.',
            confirmText: 'Archive',
            variant: 'default'
        });

        if (confirmed) {
            await db.nodes.update(sceneId, { archived: true } as Partial<Scene>);
            toast.success('Scene archived');
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleSetPOV}>
                        <Eye className="h-4 w-4 mr-2" />
                        Set Custom POV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleToggleAIExclusion}>
                        <EyeOff className="h-4 w-4 mr-2" />
                        {scene.excludeFromAI ? 'Include in AI Context' : 'Exclude from AI Context'}
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
                    {FEATURE_FLAGS.CHARACTER_DETECTION && (
                        <DropdownMenuItem onClick={handleDetectCharacters}>
                            <Users className="h-4 w-4 mr-2" />
                            Detect Characters
                        </DropdownMenuItem>
                    )}
                    {FEATURE_FLAGS.CHAT_WITH_SCENE && (
                        <DropdownMenuItem onClick={handleChatWithScene}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat with Scene
                        </DropdownMenuItem>
                    )}

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
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmationDialog />
            <PromptDialog />
        </>
    );
}
