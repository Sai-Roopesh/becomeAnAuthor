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
import { ContinueWritingMenu } from './continue-writing-menu';
import { GenerateOptions } from './tweak-generate-dialog';
import { generateText } from '@/lib/ai-service';
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
        editorProps: {
            attributes: {
                class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[500px]',
                style: `font-family: ${formatSettings.fontFamily}; font-size: ${formatSettings.fontSize}px; line-height: ${formatSettings.lineHeight}; text-align: ${formatSettings.alignment};`,
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
        onUpdate: ({ editor }) => {
            setContent(editor.getJSON());
            // Update word count
            if (onWordCountChange) {
                onWordCountChange(editor.storage.characterCount.words());
            }
        },
    });

    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async (options: GenerateOptions & { mode?: string }) => {
        if (!editor || isGenerating) return;
        setIsGenerating(true);

        const model = options.model || localStorage.getItem('last_used_model') || '';

        if (!model) {
            alert('Please select a model to generate text.');
            setIsGenerating(false);
            return;
        }

        // Get context from current scene
        const currentText = editor.getText();
        const lastContext = currentText.slice(-2000); // Last 2000 chars

        // Build system prompt based on mode
        let systemPrompt = '';
        const mode = options.mode || 'continue-writing';

        switch (mode) {
            case 'scene-beat':
                systemPrompt = `You are a creative writing assistant. Generate a pivotal scene beat - a key moment where something important changes, driving the narrative forward. Write approximately ${options.wordCount} words. Focus on creating dramatic moments, turning points, or revelations.`;
                break;
            case 'continue-writing':
                systemPrompt = `You are a creative writing assistant. Continue the story naturally based on the context provided, maintaining the same style and tone. Write approximately ${options.wordCount} words.`;
                break;
            case 'codex-progression':
                systemPrompt = `You are a creative writing assistant specializing in world-building. Analyze the recent events and suggest updates for Codex entries (characters, locations, items, events). Provide structured suggestions. Write approximately ${options.wordCount} words.`;
                break;
            default:
                systemPrompt = `You are a creative writing assistant. Continue the story naturally based on the context provided. Write approximately ${options.wordCount} words.`;
        }

        if (options.instructions) {
            systemPrompt += `\n\nAdditional instructions: ${options.instructions}`;
        }

        try {
            const response = await generateText({
                model,
                system: systemPrompt,
                prompt: `Continue this story:\n\n${lastContext}`,
                maxTokens: Math.min(4000, Math.max(100, Math.round(options.wordCount * 1.5))), // Estimate tokens from words
                temperature: 0.7,
            });

            const generatedText = response.text;

            // Insert at cursor
            editor.chain().focus().insertContent(generatedText).run();

            // Save last used model
            localStorage.setItem('last_used_model', model);
        } catch (error) {
            console.error('Generation error:', error);
            alert(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // Save content to DB
    useEffect(() => {
        if (!debouncedContent || !sceneId) return;
        db.nodes.update(sceneId, {
            content: debouncedContent,
            updatedAt: Date.now(),
        } as any).catch(console.error);
    }, [debouncedContent, sceneId]);

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
            <ContinueWritingMenu
                open={showContinueMenu}
                onOpenChange={setShowContinueMenu}
                onGenerate={handleGenerate}
            />
            <div className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto" style={{ maxWidth: `${formatSettings.pageWidth}px` }}>
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
