'use client';

/**
 * SceneNotesPanel
 * 
 * Per-scene freeform notes panel for the right sidebar.
 * Uses Tiptap for rich text editing with auto-save.
 * Follows responsive design guidelines from CODING_GUIDELINES.md.
 */

import { useCallback, useState } from 'react';
import { useSceneNote } from '../hooks/use-scene-note';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import { StickyNote, Trash2, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { TiptapContent } from '@/shared/types/tiptap';

interface SceneNotesPanelProps {
    sceneId: string | null;
    projectId: string;
    className?: string;
}

export function SceneNotesPanel({ sceneId, projectId, className }: SceneNotesPanelProps) {
    const {
        note,
        isLoading,
        isSaving,
        error,
        updateContent,
        deleteNote,
    } = useSceneNote({ sceneId, projectId });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Tiptap editor instance
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Placeholder.configure({
                placeholder: 'Write notes for this scene...',
            }),
        ],
        content: note?.content ?? { type: 'doc', content: [] },
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            const content = editor.getJSON() as TiptapContent;
            updateContent(content);
        },
    }, [note?.sceneId]); // Re-create when scene changes

    // Sync editor content when note loads
    const handleEditorMount = useCallback(() => {
        if (editor && note?.content) {
            const currentJson = JSON.stringify(editor.getJSON());
            const noteJson = JSON.stringify(note.content);
            if (currentJson !== noteJson) {
                editor.commands.setContent(note.content);
            }
        }
    }, [editor, note?.content]);

    // Effect to sync content
    if (editor && note?.content) {
        handleEditorMount();
    }

    // No scene selected
    if (!sceneId) {
        return (
            <div className={cn('h-full flex flex-col', className)}>
                <EmptyState
                    variant="minimal"
                    icon={<StickyNote className="h-8 w-8" />}
                    title="No Scene Selected"
                    description="Select a scene to view or add notes"
                />
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className={cn('h-full flex items-center justify-center', className)}>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={cn('h-full flex flex-col', className)}>
                <EmptyState
                    variant="minimal"
                    icon={<StickyNote className="h-8 w-8 text-destructive" />}
                    title="Error Loading Notes"
                    description={error}
                />
            </div>
        );
    }

    const handleDelete = async () => {
        await deleteNote();
        setShowDeleteConfirm(false);
    };

    return (
        <div className={cn('h-full flex flex-col', className)}>
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/10">
                <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Scene Notes</span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Saving indicator */}
                    {isSaving && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Saving...</span>
                        </div>
                    )}
                    {/* Delete button */}
                    {!showDeleteConfirm ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                            title="Clear notes"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    ) : (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={handleDelete}
                            >
                                Confirm
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor */}
            <ScrollArea className="flex-1">
                <EditorContent editor={editor} className="min-h-full" />
            </ScrollArea>

            {/* Footer - last updated */}
            {note && (
                <div className="flex-shrink-0 px-4 py-2 border-t border-border/30 bg-muted/5">
                    <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(note.updatedAt).toLocaleString()}
                    </p>
                </div>
            )}
        </div>
    );
}
