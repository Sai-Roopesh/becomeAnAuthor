/**
 * Custom hook for AI text generation in the editor
 * Handles generation logic, immediate saves, and error handling
 */

import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { db } from '@/lib/db';
import { generateText } from '@/lib/ai-service';
import { toast } from '@/lib/toast-service';
import { storage } from '@/lib/safe-storage';
import { STORAGE_KEYS, AI_DEFAULTS } from '@/lib/constants';
import type { ChatContext } from '@/lib/types';

// Import and re-export the interface from the actual source
import type { GenerateOptions } from '@/components/editor/tweak-generate-dialog';

export type { GenerateOptions };

export function useAIGeneration(editor: Editor | null, sceneId: string) {
    const [isGenerating, setIsGenerating] = useState(false);

    const generate = async (options: GenerateOptions & { mode?: string }) => {
        if (!editor || isGenerating) return;
        setIsGenerating(true);

        const model = options.model || storage.getItem<string>(STORAGE_KEYS.LAST_USED_MODEL, '');

        if (!model) {
            toast.error('Please select a model to generate text.');
            setIsGenerating(false);
            return;
        }

        const currentText = editor.getText();
        const lastContext = currentText.slice(-AI_DEFAULTS.CONTEXT_WINDOW_CHARS);

        // Build system prompt based on mode
        let systemPrompt = '';
        switch (options.mode) {
            case 'scene-beat':
                systemPrompt = 'You are a creative writing assistant. Generate a pivotal scene moment that advances the story.';
                break;
            case 'continue':
                systemPrompt = 'You are a creative writing assistant. Continue the story naturally from where it left off.';
                break;
            case 'codex':
                systemPrompt = 'You are a worldbuilding expert. Suggest detailed worldbuilding elements based on the story.';
                break;
            default:
                systemPrompt = options.instructions || 'You are a helpful creative writing assistant.';
        }

        try {
            const response = await generateText({
                model,
                system: systemPrompt,
                prompt: `Context: ${lastContext}\n\n${options.instructions || `Write approximately ${options.wordCount || 200} words continuing from this context.`}`,
                maxTokens: options.wordCount ? options.wordCount * 2 : AI_DEFAULTS.MAX_TOKENS,
                temperature: AI_DEFAULTS.TEMPERATURE,
            });

            const generatedText = response.text;

            if (generatedText && editor) {
                // Insert generated text at cursor
                editor.chain().focus().insertContent(generatedText).run();

                // IMMEDIATE save after AI generation (no debounce)
                await db.nodes.update(sceneId, {
                    content: editor.getJSON(),
                    updatedAt: Date.now(),
                } as any);

                // Save last used model
                storage.setItem(STORAGE_KEYS.LAST_USED_MODEL, model);
            }
        } catch (error) {
            console.error('Generation failed:', error);
            toast.error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return { generate, isGenerating };
}
