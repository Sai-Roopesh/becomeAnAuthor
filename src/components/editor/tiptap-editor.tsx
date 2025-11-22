'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { useDebounce } from '@/hooks/use-debounce';
import { EditorToolbar } from './editor-toolbar';
import { TextSelectionMenu } from './text-selection-menu';
import { useFormatStore } from '@/store/use-format-store';
import { Section } from '@/lib/tiptap-extensions/section-node';

import Mention from '@tiptap/extension-mention';
import { suggestion } from './suggestion';

export function TiptapEditor({
    sceneId,
    initialContent,
    onWordCountChange
}: {
    sceneId: string,
    initialContent: any,
    onWordCountChange?: (count: number) => void
}) {
    const [content, setContent] = useState(initialContent);
    const debouncedContent = useDebounce(content, 1000);
    const formatSettings = useFormatStore();

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Typography,
            CharacterCount,
            Section,
            Placeholder.configure({
                placeholder: 'Start writing your masterpiece... Type / for commands',
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention',
                },
                suggestion,
            }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[500px]',
                style: `font-family: ${formatSettings.fontFamily}; font-size: ${formatSettings.fontSize}px; line-height: ${formatSettings.lineHeight}; text-align: ${formatSettings.alignment};`,
            },
        },
        onUpdate: ({ editor }) => {
            setContent(editor.getJSON());
            // Update word count
            if (onWordCountChange) {
                onWordCountChange(editor.storage.characterCount.words());
            }
        },
    });

    const [isGenerating, setIsGenerating] = useState(false);

    const generateText = async (editor: any) => {
        if (isGenerating) return;
        setIsGenerating(true);

        const apiKey = localStorage.getItem('openrouter_api_key');
        const model = localStorage.getItem('openrouter_model') || 'openai/gpt-3.5-turbo';

        if (!apiKey) {
            alert('Please set your API Key in settings.');
            setIsGenerating(false);
            return;
        }

        // Get last 1000 characters as context
        const context = editor.getText().slice(-1000);
        const prompt = `Continue the story from here:\n\n${context}`;

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'OpenSource Novel Writer',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            const data = await response.json();
            const text = data.choices[0]?.message?.content || '';

            if (text) {
                editor.chain().focus().insertContent(text).run();
            }
        } catch (error) {
            console.error('Generation failed', error);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        if (debouncedContent) {
            db.nodes.update(sceneId, {
                content: debouncedContent,
                updatedAt: Date.now(),
                wordCount: editor?.storage.characterCount?.words() || 0
            } as any);
        }
    }, [debouncedContent, sceneId, editor]);

    // Add keyboard shortcuts
    useEffect(() => {
        if (!editor) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + J for AI generation
            if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
                e.preventDefault();
                generateText(editor);
            }

            // Forward slash for commands hint
            if (e.key === '/' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                // Slash command handled by placeholder text
            }
        };

        const dom = editor.view.dom;
        dom.addEventListener('keydown', handleKeyDown);
        return () => dom.removeEventListener('keydown', handleKeyDown);
    }, [editor, isGenerating]);

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
            <TextSelectionMenu editor={editor} />
            <div className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto" style={{ maxWidth: `${formatSettings.pageWidth}px` }}>
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
