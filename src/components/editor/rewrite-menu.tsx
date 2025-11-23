'use client';

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Wand2, Minimize2, Maximize2, RefreshCw, Eye } from 'lucide-react';
import { useState } from 'react';
import { generateText } from '@/lib/ai-service';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TinkerMode } from './tinker-mode';

export function RewriteMenu({ editor }: { editor: Editor | null }) {
    const [isRewriting, setIsRewriting] = useState(false);
    const [showTinker, setShowTinker] = useState(false);

    if (!editor) return null;

    const handleRewrite = async (mode: 'shorten' | 'expand' | 'rephrase' | 'show-dont-tell') => {
        const selection = editor.state.selection;
        const text = editor.state.doc.textBetween(selection.from, selection.to);

        if (!text) return;

        setIsRewriting(true);
        const model = localStorage.getItem('last_used_model') || '';

        if (!model) {
            alert('Please select a model in settings or chat to use AI features.');
            setIsRewriting(false);
            return;
        }

        let prompt = "";
        switch (mode) {
            case 'shorten': prompt = `Shorten the following text while keeping the core meaning:\n\n"${text}"`; break;
            case 'expand': prompt = `Expand the following text with more descriptive details:\n\n"${text}"`; break;
            case 'rephrase': prompt = `Rephrase the following text to improve flow and clarity:\n\n"${text}"`; break;
            case 'show-dont-tell': prompt = `Rewrite the following text using the "Show, Don't Tell" technique. Describe sensory details and actions instead of feelings:\n\n"${text}"`; break;
        }

        try {
            const response = await generateText({
                model,
                system: 'You are a helpful creative writing assistant.',
                prompt,
                maxTokens: 1000,
            });

            const newText = response.text;

            if (newText) {
                editor.chain().focus().insertContent(newText).run();
            }
        } catch (error) {
            console.error('Rewrite failed', error);
            alert(`Rewrite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsRewriting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1" disabled={isRewriting}>
                    <Wand2 className="h-3.5 w-3.5" />
                    {isRewriting ? 'Rewriting...' : 'AI Rewrite'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleRewrite('rephrase')}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Rephrase
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRewrite('shorten')}>
                    <Minimize2 className="h-4 w-4 mr-2" /> Shorten
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRewrite('expand')}>
                    <Maximize2 className="h-4 w-4 mr-2" /> Expand
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRewrite('show-dont-tell')}>
                    <Eye className="h-4 w-4 mr-2" /> Show, Don't Tell
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowTinker(true)}>
                    <Wand2 className="h-4 w-4 mr-2" /> Tinker Mode...
                </DropdownMenuItem>
            </DropdownMenuContent>
            <TinkerMode editor={editor} open={showTinker} onOpenChange={setShowTinker} />
        </DropdownMenu>
    );
}
