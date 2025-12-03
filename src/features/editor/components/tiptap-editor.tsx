'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useAI } from '@/hooks/use-ai';
import { EditorToolbar } from './editor-toolbar';
import { TextSelectionMenu } from './text-selection-menu';
import { ContinueWritingMenu } from './continue-writing-menu';
import { useFormatStore } from '@/store/use-format-store';
import { Section } from '@/lib/tiptap-extensions/section-node';
import { AI_DEFAULTS } from '@/lib/config/constants';

import Mention from '@tiptap/extension-mention';
import { createCodexSuggestion } from './suggestion';
import { useCodexRepository } from '@/hooks/use-codex-repository';

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
    const formatSettings = useFormatStore();
    const [showContinueMenu, setShowContinueMenu] = useState(false);
    const previousSceneIdRef = useRef<string | null>(null);
    const codexRepo = useCodexRepository();

    // Create suggestion configuration with projectId and repository
    const suggestion = useMemo(
        () => createCodexSuggestion(projectId, codexRepo),
        [projectId, codexRepo]
    );

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
        content: content,
        onUpdate: ({ editor }) => {
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
                if ((event.metaKey || event.ctrlKey) && event.key === 'j') {
                    event.preventDefault();
                    setShowContinueMenu(true);
                    return true;
                }
                return false;
            },
        },
    });

    useEffect(() => {
        if (!editor) return;

        if (previousSceneIdRef.current !== null && previousSceneIdRef.current !== sceneId) {
            editor.commands.setContent(content);
            editor.commands.clearContent();
            editor.commands.setContent(content);
        }

        previousSceneIdRef.current = sceneId;
    }, [sceneId, content, editor]);

    useAutoSave(sceneId, editor);

    const { generateStream, isGenerating, model, setModel, cancel } = useAI({
        system: 'You are a creative writing assistant helping to continue a story.',
        streaming: true,
        persistModel: true,
        operationName: 'Continue Writing',
    });

    const generate = async (options: any) => {
        if (!editor) return;

        const currentText = editor.getText();
        const lastContext = currentText.slice(-AI_DEFAULTS.CONTEXT_WINDOW_CHARS);

        const prompt = `Context: ${lastContext}\n\n${options.instructions || `Write approximately ${options.wordCount || 200} words continuing from this context.`}`;

        let generatedText = '';

        await generateStream(
            {
                prompt,
                maxTokens: options.wordCount ? options.wordCount * 2 : AI_DEFAULTS.MAX_TOKENS,
                temperature: AI_DEFAULTS.TEMPERATURE,
            },
            {
                onChunk: (chunk) => {
                    generatedText += chunk;
                },
                onComplete: async (fullText) => {
                    if (fullText && editor) {
                        editor.chain().focus().insertContent(fullText).run();
                    }

                    const { saveCoordinator } = await import('@/lib/core/save-coordinator');
                    await saveCoordinator.scheduleSave(sceneId, () => editor!.getJSON());
                },
            }
        );
    };

    useEffect(() => {
        if (editor && onWordCountChange) {
            onWordCountChange(editor.storage.characterCount.words());
        }
    }, [editor, onWordCountChange]);

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
                isGenerating={isGenerating}
                onCancel={cancel}
            />
            <div className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto" style={{ maxWidth: `${formatSettings.pageWidth}px` }}>
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
