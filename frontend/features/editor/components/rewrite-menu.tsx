'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Wand2, Minimize2, Maximize2, RefreshCw, Eye, X } from 'lucide-react';
import { useState, memo } from 'react';
import { useAI } from '@/hooks/use-ai';
import { ModelSelector } from '@/components/model-selector';
import { TinkerMode } from './tinker-mode';
import type { EditorStateManager } from '@/lib/core/editor-state-manager';

export const RewriteMenu = memo(function RewriteMenu({
    editor,
    sceneId,
    editorStateManager
}: {
    editor: Editor | null;
    sceneId: string;
    editorStateManager: EditorStateManager | null;
}) {
    const [showTinker, setShowTinker] = useState(false);
    const [streamingResult, setStreamingResult] = useState('');
    const [currentMode, setCurrentMode] = useState<string | null>(null);

    const { generateStream, isGenerating, model, setModel, cancel } = useAI({
        system: `You are an expert creative writing editor specializing in prose improvement.

EDITING PRINCIPLES:
- Show, don't tell: Transform telling into vivid scenes
- Strong verbs: Replace weak verb + adverb with precise, powerful verbs
- Active voice: Prioritize active constructions over passive
- Sensory details: Engage sight, sound, touch, smell, taste
- Filter words: Remove distancing words ("saw," "felt," "heard," "seemed")

STYLE GOALS:
- Clarity: Every sentence should be immediately understood
- Conciseness: Cut unnecessary words without losing impact
- Vividness: Make the reader see and feel the scene
- Flow: Vary sentence length and structure for rhythm

Provide only the improved text without explanation, matching the original tone and style.`,
        persistModel: true,
        operationName: 'Rewrite',
    });

    if (!editor) return null;

    const handleRewrite = async (mode: 'shorten' | 'expand' | 'rephrase' | 'show-dont-tell') => {
        const selection = editor.state.selection;
        const text = editor.state.doc.textBetween(selection.from, selection.to);

        if (!text) return;

        // Build prompt based on mode with few-shot examples
        let prompt = "";
        switch (mode) {
            case 'shorten':
                prompt = `Shorten this text while keeping the core meaning.

GUIDELINES:
- Remove unnecessary words and redundancy
- Keep the strongest verbs and most vivid details
- Maintain the original tone

EXAMPLES:
Before: "He walked slowly across the room, feeling nervous and uncertain about what he might find."
After: "He crept across the room, uncertain."

Before: "The sky was gray and cloudy, with dark storm clouds gathering overhead."
After: "Storm clouds gathered overhead."

Now shorten:
"${text}"`;
                break;
            case 'expand':
                prompt = `Expand this text with vivid sensory details.

GUIDELINES:
- Add sight, sound, touch, smell, or taste
- Use strong, specific verbs
- Show character emotions through body language
- Maintain the original meaning and tone

EXAMPLES:
Before: "He walked into the room."
After: "He pushed through the door. The room smelled of stale coffee and old paper. Fluorescent lights hummed overhead, casting everything in pale, sickly white."

Before: "She was happy."
After: "A smile tugged at her lips. Her steps lightened, almost bouncing. The weight she'd carried for weeks—gone."

Now expand:
"${text}"`;
                break;
            case 'rephrase':
                prompt = `Rephrase this text to improve flow and clarity.

GUIDELINES:
- Vary sentence structure
- Use active voice
- Choose precise, vivid words
- Maintain the meaning and tone

EXAMPLES:
Before: "The man was seen walking down the street by the detective."
After: "The detective spotted the man walking down the street."

Before: "There was a loud sound that came from the basement."
After: "A crash echoed from the basement."

Now rephrase:
"${text}"`;
                break;
            case 'show-dont-tell':
                prompt = `Rewrite using "Show, Don't Tell" technique.

GUIDELINES:
- Replace emotion words with physical reactions
- Use sensory details (sight, sound, touch, smell, taste)
- Show actions and body language
- Remove filter words ("felt," "seemed," "appeared")

EXAMPLES:
Before: "He was nervous."
After: "His hands trembled. Sweat beaded on his forehead. He wiped his palms on his jeans."

Before: "She felt relieved."
After: "Her shoulders dropped. The knot in her chest loosened. She exhaled—long, shaky."

Before: "The room was creepy."
After: "Shadows clung to the corners. Dust motes drifted through pale light. The floorboards groaned underfoot."

Now rewrite:
"${text}"`;
                break;
        }

        setCurrentMode(mode);
        setStreamingResult('');

        await generateStream(
            {
                prompt,
                maxTokens: 1000,
            },
            {
                onChunk: (chunk) => {
                    setStreamingResult(prev => prev + chunk);
                },
                onComplete: async (fullText) => {
                    // Replace selected text with result
                    if (fullText) {
                        editor.chain().focus().insertContent(fullText).run();

                        // ✅ NEW: Immediate save after AI rewrite
                        if (editorStateManager) {
                            await editorStateManager.saveImmediate();
                        }
                    }
                    setStreamingResult('');
                    setCurrentMode(null);
                },
            }
        );
    };

    const handleCancel = () => {
        cancel();
        setStreamingResult('');
        setCurrentMode(null);
    };

    return (
        <>
            <div className="flex items-center gap-2 p-2 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700">
                {/* Model Selector */}
                <div className="w-48">
                    <ModelSelector
                        value={model}
                        onValueChange={setModel}
                    />
                </div>

                <div className="w-px h-6 bg-gray-600" />

                {/* Rewrite Options */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRewrite('shorten')}
                    disabled={isGenerating}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                    <Minimize2 className="w-4 h-4 mr-1" />
                    Shorten
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRewrite('expand')}
                    disabled={isGenerating}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                    <Maximize2 className="w-4 h-4 mr-1" />
                    Expand
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRewrite('rephrase')}
                    disabled={isGenerating}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Rephrase
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRewrite('show-dont-tell')}
                    disabled={isGenerating}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                    <Eye className="w-4 h-4 mr-1" />
                    Show, Don't Tell
                </Button>

                <div className="w-px h-6 bg-gray-600" />

                {/* Tinker Mode */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTinker(!showTinker)}
                    disabled={isGenerating}
                    className="text-gray-300 hover:text-white hover:bg-gray-700"
                >
                    <Wand2 className="w-4 h-4 mr-1" />
                    Tweak & Generate
                </Button>

                {/* Cancel button when generating */}
                {isGenerating && (
                    <>
                        <div className="w-px h-6 bg-gray-600" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                        </Button>
                    </>
                )}
            </div>

            {/* Streaming preview */}
            {isGenerating && streamingResult && (
                <div className="mt-2 p-3 bg-gray-800/95 backdrop-blur-sm rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-400 mb-2">
                        {currentMode && `${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}ing...`}
                    </div>
                    <div className="text-sm text-gray-200">
                        {streamingResult}
                        <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse" />
                    </div>
                </div>
            )}

            {/* Tinker Mode Dialog */}
            <TinkerMode
                open={showTinker}
                onOpenChange={setShowTinker}
                editor={editor}
                sceneId={sceneId}
                editorStateManager={editorStateManager}
            />
        </>
    );
});
