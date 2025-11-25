'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useState, useRef } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useAIGeneration } from '@/hooks/use-ai-generation';
import { EditorToolbar } from './editor-toolbar';
import { TextSelectionMenu } from './text-selection-menu';
import { ContinueWritingMenu } from './continue-writing-menu';
import { useFormatStore } from '@/store/use-format-store';
import { Section } from '@/lib/tiptap-extensions/section-node';

import Mention from '@tiptap/extension-mention';
import { suggestion } from './suggestion';

export function TiptapEditor({
    sceneId,
    projectId,
    content,
    onWordCountChange
}: {
    sceneId: string,
    projectId: string,
    content: any,
    onWordCountChange?: (count: number) => void
}) {
    // Remove local state for content to prevent re-renders and serialization overhead
    const formatSettings = useFormatStore();
    const [showContinueMenu, setShowContinueMenu] = useState(false);
    const previousSceneIdRef = useRef<string | null>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Typography,
            CharacterCount,
            Section,
            Placeholder.configure({
                placeholder: 'Start writing your masterpiece... Type / for commands or press Cmd+J to continue',
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention',
                },
                suggestion,
            }),
        ],
        content: content, // Initial content only
        onUpdate: ({ editor }) => {
            // Only update word count, DO NOT serialize JSON here
            if (onWordCountChange) {
                const words = editor.storage.characterCount.words();
                onWordCountChange(words);
            }
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-full focus:outline-none min-h-[500px] px-8 py-6',
            },
            handleKeyDown: (view, event) => {
                // Cmd+J or Ctrl+J to open Continue Writing Menu
                if ((event.metaKey || event.ctrlKey) && event.key === 'j') {
                    event.preventDefault();
                    setShowContinueMenu(true);
                    return true;
                }
                return false;
            },
        },
    });

    // Handle scene changes without remounting the editor
    useEffect(() => {
        if (!editor) return;

        // Check if the scene has changed
        if (previousSceneIdRef.current !== null && previousSceneIdRef.current !== sceneId) {
            // Scene changed - update content and clear history
            editor.commands.setContent(content);
            editor.commands.clearContent(); // This clears undo/redo history
            editor.commands.setContent(content); // Set content again after clearing
        }

        previousSceneIdRef.current = sceneId;
    }, [sceneId, content, editor]);

    // Use custom hooks for business logic
    // Pass editor instance directly to handle saves efficiently
    useAutoSave(sceneId, editor);
    const { generate, isGenerating } = useAIGeneration(editor, sceneId);



    // Update word count on mount
    useEffect(() => {
        if (editor && onWordCountChange) {
            onWordCountChange(editor.storage.characterCount.words());
        }
    }, [editor, onWordCountChange]);

    // Update editor attributes when format settings change
    useEffect(() => {
        if (editor) {
            editor.view.dom.setAttribute(
                'style',
                `font-family: ${formatSettings.fontFamily}; font-size: ${formatSettings.fontSize}px; line-height: ${formatSettings.lineHeight}; text-align: ${formatSettings.alignment};`
            );
        }
    }, [editor, formatSettings]);

    if (!editor) {
        return null;
    }

    const handleInsertSection = () => {
        editor
            .chain()
            .focus()
            .insertContent({
                type: 'section',
                content: [{ type: 'paragraph' }],
            })
            .run();
    };

    return (
        <div className="w-full h-full flex flex-col">
            <EditorToolbar
                editor={editor}
                isGenerating={isGenerating}
                onInsertSection={handleInsertSection}
            />
            <TextSelectionMenu editor={editor} projectId={projectId} />
            <ContinueWritingMenu
                open={showContinueMenu}
                onOpenChange={setShowContinueMenu}
                onGenerate={generate}
                projectId={projectId}
            />
            <div className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto" style={{ maxWidth: `${formatSettings.pageWidth}px` }}>
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
