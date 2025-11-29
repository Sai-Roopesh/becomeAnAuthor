'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Wand2, Minimize2, Maximize2, RefreshCw, Eye, X } from 'lucide-react';
import { useState } from 'react';
import { useAI } from '@/hooks/use-ai';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModelCombobox } from '@/features/ai/components/model-combobox';
import { TinkerMode } from './tinker-mode';

export function RewriteMenu({ editor }: { editor: Editor | null }) {
    const [showTinker, setShowTinker] = useState(false);
    const [streamingResult, setStreamingResult] = useState('');
    const [currentMode, setCurrentMode] = useState<string | null>(null);

    const { generateStream, isGenerating, model, setModel, cancel } = useAI({
        system: 'You are a creative writing assistant.',
        streaming: true,
        persistModel: true,
        operationName: 'Rewrite',
    });

    if (!editor) return null;

    const handleRewrite = async (mode: 'shorten' | 'expand' | 'rephrase' | 'show-dont-tell') => {
        const selection = editor.state.selection;
        const text = editor.state.doc.textBetween(selection.from, selection.to);

        if (!text) return;

        // Build prompt based on mode
        let prompt = "";
        switch (mode) {
            case 'shorten':
                prompt = `Shorten the following text while keeping the core meaning:\n\n"${text}"`;
                break;
            case 'expand':
                prompt = `Expand the following text with more descriptive details:\n\n"${text}"`;
                break;
            case 'rephrase':
                prompt = `Rephrase the following text to improve flow and clarity:\n\n"${text}"`;
                break;
            case 'show-dont-tell':
                prompt = `Rewrite the following text using the "Show, Don't Tell" technique. Describe sensory details and actions instead of feelings:\n\n"${text}"`;
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
                onComplete: (fullText) => {
                    // Replace selected text with result
                    if (fullText) {
                        editor.chain().focus().insertContent(fullText).run();
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
                    <ModelCombobox
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
            />
        </>
    );
}
