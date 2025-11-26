'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { useDebounce } from '@/hooks/use-debounce';
import { EditorToolbar } from './editor-toolbar';

import Mention from '@tiptap/extension-mention';
import { suggestion } from './suggestion';

export function TiptapEditor({ sceneId, initialContent }: { sceneId: string, initialContent: any }) {
    const [content, setContent] = useState(initialContent);
    const debouncedContent = useDebounce(content, 1000);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Typography,
            Placeholder.configure({
                placeholder: 'Start writing your masterpiece...',
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
            },
        },
        onUpdate: ({ editor }) => {
            setContent(editor.getJSON());
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
                // Calculate word count roughly
                wordCount: editor?.storage.characterCount?.words() || 0
            } as any);
        }
    }, [debouncedContent, sceneId, editor]);

    // Add keyboard shortcut
    useEffect(() => {
        if (!editor) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
                e.preventDefault();
                generateText(editor);
            }
        };

        const dom = editor.view.dom;
        dom.addEventListener('keydown', handleKeyDown);
        return () => dom.removeEventListener('keydown', handleKeyDown);
    }, [editor, isGenerating]);

    if (!editor) {
        return null;
    }

    return (
        <div className="w-full h-full flex flex-col">
            <EditorToolbar editor={editor} isGenerating={isGenerating} />
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-3xl mx-auto">
                    {/* {editor && (
                        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
                            <div className="bg-background border rounded-md shadow-md flex p-1 gap-1">
                                <button
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    className={`p-1 rounded hover:bg-accent ${editor.isActive('bold') ? 'bg-accent' : ''}`}
                                >
                                    <strong className="font-bold">B</strong>
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    className={`p-1 rounded hover:bg-accent ${editor.isActive('italic') ? 'bg-accent' : ''}`}
                                >
                                    <em className="italic">I</em>
                                </button>
                                <button
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    className={`p-1 rounded hover:bg-accent ${editor.isActive('strike') ? 'bg-accent' : ''}`}
                                >
                                    <span className="line-through">S</span>
                                </button>
                            </div>
                        </BubbleMenu>
                    )} */}
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
