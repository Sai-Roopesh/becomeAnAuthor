'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useState } from 'react';
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
    initialContent,
    onWordCountChange
}: {
    sceneId: string,
    projectId: string,
    initialContent: any,
    onWordCountChange?: (count: number) => void
}) {
    const [content, setContent] = useState(initialContent);
    const debouncedContent = useDebounce(content, 1000);
    const formatSettings = useFormatStore();
    const [showContinueMenu, setShowContinueMenu] = useState(false);

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
        content: initialContent,
        onUpdate: ({ editor }) => {
            const json = editor.getJSON();
            setContent(json);

            // Update word count
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

    // Use custom hooks for business logic
    useAutoSave(sceneId, content, debouncedContent);
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
